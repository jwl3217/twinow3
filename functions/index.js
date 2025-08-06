// functions/index.js

const functions = require('firebase-functions');
const admin     = require('firebase-admin');
const express   = require('express');
const cors      = require('cors');
const axios     = require('axios');

admin.initializeApp();

// ─────────────────────────────────────────────────────────────────────────────
// 1) 관리자 전용: 계정 생성
// ─────────────────────────────────────────────────────────────────────────────
exports.createUser = functions.https.onCall(async (data, context) => {
  if (!context.auth || context.auth.token.admin !== true) {
    throw new functions.https.HttpsError(
      'permission-denied',
      '관리자만 사용 가능합니다'
    );
  }
  const { email, password } = data;
  if (!email || !password) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      '이메일과 비밀번호를 모두 전달해야 합니다'
    );
  }
  const userRecord = await admin.auth().createUser({ email, password });
  return { uid: userRecord.uid };
});

// ─────────────────────────────────────────────────────────────────────────────
// 2) 관리자 전용: 계정 삭제
// ─────────────────────────────────────────────────────────────────────────────
exports.deleteUser = functions.https.onCall(async (data, context) => {
  if (!context.auth || context.auth.token.admin !== true) {
    throw new functions.https.HttpsError(
      'permission-denied',
      '관리자만 사용 가능합니다'
    );
  }
  const { uid } = data;
  if (!uid) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      '삭제할 UID를 전달해야 합니다'
    );
  }
  await admin.auth().deleteUser(uid);
  return { success: true };
});

// ─────────────────────────────────────────────────────────────────────────────
// 3) 관리자 전환용: 커스텀 토큰 생성
//    → 이제는 admin 체크 없이, 전달된 uid로 토큰만 발급
// ─────────────────────────────────────────────────────────────────────────────
exports.createCustomToken = functions.https.onCall(async (data, context) => {
  const { uid } = data;
  if (!uid) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'uid를 전달해주세요'
    );
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

const API_KEY     = functions.config().payaction.api;
const WEBHOOK_KEY = functions.config().payaction.webhook;
const STORE_KEY   = functions.config().payaction.store;

// 결제 생성 (functions/index.js 에서)
app.post('/createPayment', async (req, res) => {
  const { amount, orderId } = req.body;
  if (!amount || !orderId) {
    return res.status(400).json({ error: 'amount와 orderId를 모두 전달해야 합니다' });
  }
  try {
    const resp = await axios.post(
      'https://api.payaction.io/v1/payments',
      { store_key: STORE_KEY, amount, order_id: orderId },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10_000
      }
    );
    return res.json({ paymentUrl: resp.data.payment_url });
  } catch (err) {
    // 에러 출력 강화
    console.error('❌ PayAction 결제 생성 오류 status=', err.response?.status);
    console.error('❌ PayAction error.data=', err.response?.data);
    console.error('❌ PayAction error.message=', err.message);
    return res.status(500).json({
      error: 'internal',
      details: err.response?.data || err.message
    });
  }
});


// Webhook 수신
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-payaction-signature'];
  if (signature !== WEBHOOK_KEY) {
    console.error('Invalid webhook signature:', signature);
    return res.status(400).send('Invalid signature');
  }
  console.log('✅ PayAction Webhook 수신:', req.body);
  // TODO: 이벤트에 따라 Firestore 업데이트 등 처리
  return res.status(200).send('OK');
});

exports.payaction = functions.https.onRequest(app);
