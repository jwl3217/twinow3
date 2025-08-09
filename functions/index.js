/* functions/index.js */
require('dotenv').config();

const axios   = require('axios');
const cors    = require('cors');
const express = require('express');
const admin   = require('firebase-admin');
const { onRequest } = require('firebase-functions/v2/https');

if (!admin.apps.length) {
  admin.initializeApp(); // default credentials
}
const db = admin.firestore();

const app = express();
app.use(cors({ origin: ['https://twinow.kr', 'http://localhost:3000'], credentials: true }));
app.use(express.json());

/** 헬스체크 */
app.get('/health', (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

/** 주문 생성: 프론트에서 /api/order 로 POST */
app.post('/order', async (req, res) => {
  try {
    const {
      merchantUid, amount, depositorName,
      buyerPhone = '', buyerEmail = '', userId
    } = req.body || {};

    if (!merchantUid || !amount || !depositorName || !userId) {
      return res.status(400).json({ success: false, error: 'merchantUid, amount, depositorName, userId 모두 필요합니다.' });
    }

    // 1) 페이액션 주문 생성
    const payload = { merchantUid, amount: Number(amount), depositorName };
    if (buyerPhone) payload.buyerPhone = buyerPhone;
    if (buyerEmail) payload.buyerEmail = buyerEmail;

    const { data } = await axios.post(
      'https://api.payaction.app/order',
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.PAYACTION_API_KEY,
          'x-mall-id': process.env.PAYACTION_MALL_ID,
        },
        timeout: 10000,
      }
    );

    if (data.status !== 'success') {
      return res.status(400).json({ success: false, error: data.response?.message || '주문 생성 실패', details: data });
    }

    // 2) Firestore 저장
    const docRef = db.collection('payments').doc(merchantUid);
    await docRef.set({
      merchantUid,
      userId,
      amount: Number(amount),
      depositorName,
      buyerPhone,
      buyerEmail,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      payactionResponse: data, // 계좌정보 포함
    });

    return res.json({
      success: true,
      order: {
        merchantUid,
        status: 'pending',
        bankInfo: data.response, // { bankName, accountNumber, accountHolder, ... }
      },
    });
  } catch (err) {
    console.error('create order error', err?.response?.data || err.message);
    if (err.response) {
      return res.status(err.response.status).json({ success: false, error: '페이액션 오류', details: err.response.data });
    }
    return res.status(500).json({ success: false, error: '서버 오류' });
  }
});

/** 페이액션 웹훅 수신: 대시보드에 https://twinow.kr/webhook/payaction 등록 */
app.post('/webhook/payaction', async (req, res) => {
  try {
    const incomingKey  = req.get('x-webhook-key');
    const incomingMall = req.get('x-mall-id');

    // 헤더 검증
    if (incomingKey !== process.env.PAYACTION_WEBHOOK_KEY ||
        incomingMall !== process.env.PAYACTION_MALL_ID) {
      console.warn('Webhook auth failed');
      // 그래도 성공 반환해서 재전송 폭주 방지 가능하지만, 여기선 실패 반환
      return res.status(401).json({ status: 'error' });
    }

    const event = req.body || {};
    // 문서에 오는 키 이름이 `merchant_uid` 기준. 혹시 대비해서 둘 다 지원
    const merchantUid = event.merchant_uid || event.merchantUid;
    const status      = event.status;

    if (!merchantUid) {
      return res.status(400).json({ status: 'error', message: 'merchant_uid 누락' });
    }

    const payRef = db.collection('payments').doc(merchantUid);
    const snap   = await payRef.get();
    if (!snap.exists) {
      // 주문이 없어도 성공 응답
      return res.json({ status: 'success' });
    }
    const order = snap.data();

    // 상태 업데이트 + 로그 적재
    const update = {
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      webhookEvents: admin.firestore.FieldValue.arrayUnion({
        ...event,
        receivedAt: admin.firestore.FieldValue.serverTimestamp(),
      }),
    };

    // 매칭/완료 시 코인 지급
    if ((status === 'matched' || status === 'completed') && order.userId) {
      const userRef = db.collection('users').doc(order.userId);
      await db.runTransaction(async (tx) => {
        const u = await tx.get(userRef);
        if (!u.exists) return;
        const coins = Number(u.data().coins || 0) + Number(order.amount || 0);
        tx.update(userRef, { coins, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      });
    }

    await payRef.update(update);
    return res.json({ status: 'success' });
  } catch (err) {
    console.error('webhook error', err);
    // 재전송 정책을 고려하면 성공 반환하는 편이 안전
    return res.json({ status: 'success' });
  }
});

exports.api = onRequest({ region: 'asia-northeast3', timeoutSeconds: 60, memory: '512Mi' }, app);
