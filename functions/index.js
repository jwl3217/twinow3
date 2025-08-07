// functions/index.js
const functions = require('firebase-functions');
const admin     = require('firebase-admin');
const axios     = require('axios');
const cors      = require('cors')({ origin: true });

admin.initializeApp();

// 환경 변수
const API_KEY     = functions.config().payaction.api;
const STORE_KEY   = functions.config().payaction.store;
const WEBHOOK_KEY = functions.config().payaction.webhook;

// Firestore 컬렉션 이름
const PAY_COLLECTION = 'payments';

/** 관리자용 onCall 함수들은 그대로 둡니다 **/
exports.createUser = functions.https.onCall(async (data, context) => {
  /* …생략… */
});

exports.deleteUser = functions.https.onCall(async (data, context) => {
  /* …생략… */
});

exports.createCustomToken = functions.https.onCall(async (data) => {
  /* …생략… */
});

/**
 * 4) 주문 생성 (onRequest + CORS)
 */
exports.createPayment = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }
    const { amount } = req.body;
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'invalid-amount' });
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

      await admin.firestore()
        .collection(PAY_COLLECTION)
        .doc(orderId)
        .set({
          amount,
          bank,
          account_number,
          account_holder,
          expires_at: new Date(expires_at),
          status: 'pending',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

      return res.json({
        orderId,
        bankInfo: { bank, account_number, account_holder, expires_at }
      });
    } catch (err) {
      console.error('❌ PayAction 주문 생성 오류:', err.response?.data || err.message);
      return res.status(500).json({ error: 'internal' });
    }
  });
});

/**
 * 5) 결제 상태 조회 (onRequest + CORS)
 */
exports.getPaymentStatus = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ error: 'missing-orderId' });
    }
    try {
      const doc = await admin.firestore()
        .collection(PAY_COLLECTION)
        .doc(orderId)
        .get();
      if (!doc.exists) {
        return res.status(404).json({ error: 'not-found' });
      }
      return res.json({ status: doc.data().status });
    } catch (err) {
      console.error('결제 상태 조회 오류:', err);
      return res.status(500).json({ error: 'internal' });
    }
  });
});

/** 6) Webhook 수신은 그대로 둡니다 **/
exports.webhook = functions.https.onRequest(async (req, res) => {
  /* …생략… */
});
