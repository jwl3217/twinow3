// functions/index.js

const functions = require('firebase-functions');
const admin     = require('firebase-admin');
const express   = require('express');
const cors      = require('cors');

admin.initializeApp();

const app = express();

// CORS 설정 (필요에 따라 도메인 제한 가능)
app.use(cors({ origin: true }));
app.use(express.json());

// ─────────────────────────────────────────────────────────────────────────────
// 1) 관리자 전용: 계정 생성 (https callable → 내부용. 사용 안 하시면 제거 가능)
// ─────────────────────────────────────────────────────────────────────────────
exports.createUser = functions.https.onCall(async (data, context) => {
  if (!context.auth || context.auth.token.admin !== true) {
    throw new functions.https.HttpsError('permission-denied','관리자만 사용 가능합니다');
  }
  const { email, password } = data;
  if (!email || !password) {
    throw new functions.https.HttpsError('invalid-argument','이메일과 비밀번호를 모두 전달해야 합니다');
  }
  const userRecord = await admin.auth().createUser({ email, password });
  return { uid: userRecord.uid };
});

// ─────────────────────────────────────────────────────────────────────────────
// 2) 관리자 전용: 계정 삭제
// ─────────────────────────────────────────────────────────────────────────────
exports.deleteUser = functions.https.onCall(async (data, context) => {
  if (!context.auth || context.auth.token.admin !== true) {
    throw new functions.https.HttpsError('permission-denied','관리자만 사용 가능합니다');
  }
  const { uid } = data;
  if (!uid) {
    throw new functions.https.HttpsError('invalid-argument','삭제할 UID를 전달해야 합니다');
  }
  await admin.auth().deleteUser(uid);
  return { success: true };
});

// ─────────────────────────────────────────────────────────────────────────────
// 3) 커스텀 토큰 생성 (계정 전환 대시보드용)
// ─────────────────────────────────────────────────────────────────────────────
exports.createCustomToken = functions.https.onCall(async (data) => {
  const { uid } = data;
  if (!uid) {
    throw new functions.https.HttpsError('invalid-argument','uid를 전달해주세요');
  }
  const token = await admin.auth().createCustomToken(uid);
  return { token };
});

// ─────────────────────────────────────────────────────────────────────────────
// 4) 결제 승인 API (클라이언트에서 fetch("/api/pay/approve") 호출)
// ─────────────────────────────────────────────────────────────────────────────
app.post('/pay/approve', async (req, res) => {
  const { merchantUid, tid } = req.body;
  if (!merchantUid || !tid) {
    return res.status(400).json({ ok: false, error: 'merchantUid, tid 필수' });
  }
  // NICEPAY 승인 요청
  const fetch = require('node-fetch');
  const CLIENT_KEY = 'R2_e7af7dfe1d684817a588799dbceadc61';
  const SECRET_KEY = '23ce497b37ac441487651f3a2e5d9f58';
  const authHeader = 'Basic ' + Buffer.from(`${CLIENT_KEY}:${SECRET_KEY}`).toString('base64');

  try {
    const apiRes = await fetch('https://sandbox-api.nicepay.co.kr/v2/api/approve', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type':  'application/json'
      },
      body: JSON.stringify({ merchantUid, tid })
    });
    const data = await apiRes.json();
    if (data.resultCode === '3001') {
      // DB 업데이트 등 필요한 로직 추가 가능
      return res.json({ ok: true });
    } else {
      return res.json({ ok: false, error: data.resultMsg });
    }
  } catch (err) {
    console.error('승인 API 오류:', err);
    return res.status(500).json({ ok: false, error: '서버통신오류' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5) 무통장(Webhook) 처리 예시 (PayAction 등)
// ─────────────────────────────────────────────────────────────────────────────
app.post('/webhook/payaction', (req, res) => {
  // x-webhook-key, x-mall-id 검사...
  // req.body 처리 후
  console.log('PayAction Webhook:', req.headers, req.body);
  // 처리 완료 응답
  res.json({ status: 'success' });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6) Express 앱을 Cloud Functions HTTP로 노출
// ─────────────────────────────────────────────────────────────────────────────
exports.api = functions.https.onRequest(app);
