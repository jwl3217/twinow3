// scripts/setAdmin.js
// Firebase Admin SDK를 사용해 특정 유저를 관리자(admin)로 설정하는 스크립트입니다.

const admin = require('firebase-admin');
const serviceAccount = require('../path/to/serviceAccountKey.json'); // 서비스 계정 키 JSON 파일 경로를 실제 위치로 수정하세요.

// Firebase Admin 초기화
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// 터미널 인자로 전달된 UID를 가져옵니다.
const uid = process.argv[2];
if (!uid) {
  console.error('Usage: node setAdmin.js <uid>');
  process.exit(1);
}

// Custom Claim에 admin 권한을 설정합니다.
admin.auth().setCustomUserClaims(uid, { admin: true })
  .then(() => {
    console.log(`✅ 유저${uid}를 관리자(admin)로 설정했습니다.`);
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ 관리자 설정 실패:', err);
    process.exit(1);
  });
