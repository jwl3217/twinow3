/* functions/index.js */
require('dotenv').config();

const { onRequest } = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const axios = require('axios');

// ---------- Admin 초기화 ----------
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// ---------- Express ----------
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// 헬스체크
app.get('/health', (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

/**
 * 주문 생성 → 페이액션 /order 호출
 * body: { merchantUid, amount, depositorName, userId, buyerEmail?, buyerPhone? }
 * 반환: { success, order:{ bankInfo, merchantUid, amount, depositorName, status } }
 */
app.post('/api/order', async (req, res) => {
  try {
    const { merchantUid, amount, depositorName, userId, buyerEmail, buyerPhone } = req.body || {};

    if (!merchantUid || !amount || !depositorName || !userId) {
      return res.status(400).json({ success: false, error: 'merchantUid, amount, depositorName, userId 필수' });
    }

    // 페이액션 주문 API 호출
    const payload = {
      merchantUid,
      amount: Number(amount),
      depositorName,
      ...(buyerEmail ? { buyerEmail } : {}),
      ...(buyerPhone ? { buyerPhone } : {}),
    };

    logger.info('PayAction /order payload', payload);

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
      },
    );

    // 실패 처리
    if (!data || data.status !== 'success') {
      logger.error('PayAction /order FAIL', data);
      return res.status(400).json({
        success: false,
        error: data?.response?.message || '주문 생성 실패',
        details: data,
      });
    }

    // Firestore 기록
    const orderDoc = {
      merchantUid,
      userId,
      amount: Number(amount),
      depositorName,
      status: 'pending',
      bankInfo: data.response || null,    // 계좌정보(은행/계좌/예금주 등)
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await db.collection('payments').doc(merchantUid).set(orderDoc);

    logger.info('Order saved', orderDoc);

    return res.json({
      success: true,
      order: {
        merchantUid,
        amount: Number(amount),
        depositorName,
        status: 'pending',
        bankInfo: data.response || {
          // 페이액션에서 응답 안주는 경우 .env 제공값으로 노출
          bankName: process.env.BANK_NAME,
          accountNumber: process.env.BANK_ACCOUNT,
          accountHolder: process.env.BANK_HOLDER,
        },
      },
    });
  } catch (e) {
    logger.error('api/order error', e);
    const detail = e.response?.data || e.message;
    return res.status(500).json({ success: false, error: '서버 오류', details: detail });
  }
});

/**
 * 페이액션 웹훅 수신
 * 헤더: x-webhook-key, x-mall-id, x-trace-id
 * body 예시: { merchant_uid, status, amount, depositor_name, ... }
 * 규칙: 반드시 200 + {status:'success'}로 응답
 */
app.post('/webhook/payaction', async (req, res) => {
  // 1) 즉시 200 반환을 준비 (재전송 방지)
  const replyOk = () => res.status(200).json({ status: 'success' });

  try {
    const hKey  = req.get('x-webhook-key');
    const hMall = req.get('x-mall-id');
    const trace = req.get('x-trace-id');

    // 헤더 검증
    if (hKey !== process.env.PAYACTION_WEBHOOK_KEY || hMall !== process.env.PAYACTION_MALL_ID) {
      logger.warn('Webhook auth failed', { hKey, hMall, trace });
      return replyOk(); // 실패로 돌려도 페이액션 재전송만 늘어남 → 정상응답으로 종료
    }

    const event = req.body || {};
    logger.info('Webhook payload', { trace, event });

    const merchantUid = event.merchant_uid || event.merchantUid;
    const status = event.status;

    if (!merchantUid) {
      logger.warn('Webhook without merchantUid', { trace, event });
      return replyOk();
    }

    const payRef = db.collection('payments').doc(merchantUid);

    // 상태 업데이트 + 웹훅 로그 적재
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(payRef);
      if (!snap.exists) return;

      const prev = snap.data();
      const update = {
        status: status || prev.status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        webhookEvents: admin.firestore.FieldValue.arrayUnion({
          status,
          raw: event,
          traceId: trace,
          receivedAt: admin.firestore.FieldValue.serverTimestamp(),
        }),
      };

      // 매칭/완료 시 코인 지급 (중복 지급 방지)
      if ((status === 'matched' || status === 'completed') && prev && !prev.coinGranted) {
        const userRef = db.collection('users').doc(prev.userId);
        tx.update(userRef, {
          coins: admin.firestore.FieldValue.increment(Number(prev.amount || 0)),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        update.coinGranted = true;
      }

      tx.update(payRef, update);
    });

    return replyOk();
  } catch (e) {
    logger.error('Webhook handler error', e);
    // 어떤 경우든 페이액션에는 정상 수신 응답
    return replyOk();
  }
});

// ---------- Cloud Functions v2 Export ----------
exports.api = onRequest({ region: 'asia-northeast3', cors: true }, app);
