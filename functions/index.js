const functions = require('firebase-functions');
const admin     = require('firebase-admin');
const axios     = require('axios');

admin.initializeApp();

// 환경 변수 (functions:config 로 설정한 값)
const API_KEY     = functions.config().payaction.api;
const STORE_KEY   = functions.config().payaction.store;
const WEBHOOK_KEY = functions.config().payaction.webhook;

// Firestore 저장용 컬렉션
const PAY_COLLECTION = 'payments';

// 1) 관리자 전용: 계정 생성
exports.createUser = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', '관리자만 사용 가능합니다');
  }
  const { email, password } = data;
  if (!email || !password) {
    throw new functions.https.HttpsError('invalid-argument', '이메일과 비밀번호를 모두 전달해야 합니다');
  }
  const userRecord = await admin.auth().createUser({ email, password });
  return { uid: userRecord.uid };
});

// 2) 관리자 전용: 계정 삭제
exports.deleteUser = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', '관리자만 사용 가능합니다');
  }
  const { uid } = data;
  if (!uid) {
    throw new functions.https.HttpsError('invalid-argument', '삭제할 UID를 전달해야 합니다');
  }
  await admin.auth().deleteUser(uid);
  return { success: true };
});

// 3) 관리자 전환용: 커스텀 토큰 생성
exports.createCustomToken = functions.https.onCall(async (data) => {
  const { uid } = data;
  if (!uid) {
    throw new functions.https.HttpsError('invalid-argument', 'uid를 전달해주세요');
  }
  const token = await admin.auth().createCustomToken(uid);
  return { token };
});

// 4) 주문 생성 (Callable)
exports.createPayment = functions.https.onCall(async (data) => {
  const { amount } = data;
  if (typeof amount !== 'number' || amount <= 0) {
    throw new functions.https.HttpsError('invalid-argument', '유효한 amount가 필요합니다');
  }
  const orderId = `order_${Date.now()}`;
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
    await admin.firestore().collection(PAY_COLLECTION).doc(orderId).set({
      amount,
      bank,
      account_number,
      account_holder,
      expires_at: new Date(expires_at),
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { orderId, bankInfo: { bank, account_number, account_holder, expires_at } };
  } catch (err) {
    console.error('❌ PayAction 주문 생성 오류:', err.response?.data || err.message);
    throw new functions.https.HttpsError(
      'internal',
      '주문 생성 중 오류가 발생했습니다',
      err.response?.data || err.message
    );
  }
});

// 5) 결제 상태 조회 (Callable)
exports.getPaymentStatus = functions.https.onCall(async (data) => {
  const { orderId } = data;
  if (!orderId) {
    throw new functions.https.HttpsError('invalid-argument', 'orderId가 필요합니다');
  }
  const doc = await admin.firestore().collection(PAY_COLLECTION).doc(orderId).get();
  if (!doc.exists) {
    throw new functions.https.HttpsError('not-found', '결제 내역을 찾을 수 없습니다');
  }
  return { status: doc.data().status };
});

// 6) PayAction Webhook 수신 (HTTP)
exports.webhook = functions.https.onRequest(async (req, res) => {
  if (req.get('x-webhook-key') !== WEBHOOK_KEY || req.get('x-mall-id') !== STORE_KEY) {
    console.error('Invalid PayAction Webhook:', req.headers);
    return res.status(403).send('Forbidden');
  }
  const { type, orderId, status } = req.body;
  if (type === 'order' && status === 'matched') {
    await admin.firestore().collection(PAY_COLLECTION).doc(orderId).update({
      status: 'completed',
      matchedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }
  res.json({ status: 'success' });
});
