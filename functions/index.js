// functions/index.js
const functions = require('firebase-functions');
const admin     = require('firebase-admin');
const express   = require('express');
const cors      = require('cors');
const axios     = require('axios');

admin.initializeApp();

// PayAction 환경변수 (firebase functions:config:set로 설정)
const API_KEY     = functions.config().payaction.api;
const WEBHOOK_KEY = functions.config().payaction.webhook;
const STORE_KEY   = functions.config().payaction.store;

// Firestore 컬렉션 이름
const PAY_COLLECTION = 'payments';

// ─────────────────────────────────────────────────────────────────────────────
// 1) 관리자 전용: 계정 생성
// ─────────────────────────────────────────────────────────────────────────────
exports.createUser = functions.https.onCall(async (data, context) => {
  if (!context.auth || context.auth.token.admin !== true) {
    throw new functions.https.HttpsError('permission-denied', '관리자만 사용 가능합니다');
  }
  const { email, password } = data;
  if (!email || !password) {
    throw new functions.https.HttpsError('invalid-argument', '이메일과 비밀번호를 모두 전달해야 합니다');
  }
  const userRecord = await admin.auth().createUser({ email, password });
  return { uid: userRecord.uid };
});

// ─────────────────────────────────────────────────────────────────────────────
// 2) 관리자 전용: 계정 삭제
// ─────────────────────────────────────────────────────────────────────────────
exports.deleteUser = functions.https.onCall(async (data, context) => {
  if (!context.auth || context.auth.token.admin !== true) {
    throw new functions.https.HttpsError('permission-denied', '관리자만 사용 가능합니다');
  }
  const { uid } = data;
  if (!uid) {
    throw new functions.https.HttpsError('invalid-argument', '삭제할 UID를 전달해야 합니다');
  }
  await admin.auth().deleteUser(uid);
  return { success: true };
});

// ─────────────────────────────────────────────────────────────────────────────
// 3) 관리자 전환용: 커스텀 토큰 생성
// ─────────────────────────────────────────────────────────────────────────────
exports.createCustomToken = functions.https.onCall(async (data) => {
  const { uid } = data;
  if (!uid) {
    throw new functions.https.HttpsError('invalid-argument', 'uid를 전달해주세요');
  }
  const token = await admin.auth().createCustomToken(uid);
  return { token };
});

// ─────────────────────────────────────────────────────────────────────────────
// 4) PayAction 결제 API + Webhook (Express 앱)
// ─────────────────────────────────────────────────────────────────────────────
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// 결제 생성 엔드포인트
app.post('/createPayment', async (req, res) => {
  const { amount, orderId } = req.body;
  if (!amount || !orderId) {
    return res.status(400).json({ error: 'amount와 orderId를 모두 전달해야 합니다' });
  }

  try {
    const resp = await axios.post(
      'https://api.payaction.app/order',
      { orderId, amount },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'x-mall-id': STORE_KEY
        },
        timeout: 10000
      }
    );

    const { bank, account_number, account_holder, expires_at } = resp.data;

    // Firestore에 pending 상태로 저장
    await admin.firestore().collection(PAY_COLLECTION).doc(orderId).set({
      orderId,
      amount,
      bank,
      account_number,
      account_holder,
      expires_at: new Date(expires_at),
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return res.json({ orderId, bankInfo: { bank, account_number, account_holder, amount, expires_at } });
  } catch (err) {
    console.error('❌ PayAction 주문 생성 오류:', err.response?.data || err.message);
    return res.status(500).json({ error: 'internal', details: err.response?.data || err.message });
  }
});

// Webhook 수신 엔드포인트
app.post('/webhook', async (req, res) => {
  if (req.get('x-webhook-key') !== WEBHOOK_KEY || req.get('x-mall-id') !== STORE_KEY) {
    console.error('Invalid PayAction Webhook:', req.headers);
    return res.status(403).send('Forbidden');
  }

  const event = req.body;
  const { type, orderId, status } = event;

  if (type === 'order' && status === 'matched') {
    await admin.firestore().collection(PAY_COLLECTION).doc(orderId).update({
      status: 'completed',
      matchedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  return res.status(200).json({ status: 'success' });
});

// 결제 상태 조회 엔드포인트
app.get('/payments/:orderId', async (req, res) => {
  try {
    const doc = await admin.firestore().collection(PAY_COLLECTION).doc(req.params.orderId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Not found' });
    }
    return res.json(doc.data());
  } catch (err) {
    console.error('결제 상태 조회 오류:', err);
    return res.status(500).json({ error: 'internal' });
  }
});

exports.payaction = functions.https.onRequest(app);
