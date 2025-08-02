// functions/index.js

const functions = require('firebase-functions');
const admin     = require('firebase-admin');

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
