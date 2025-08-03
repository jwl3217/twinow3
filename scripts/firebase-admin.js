// scripts/setAdmin.js
const admin = require("firebase-admin");
const serviceAccount = require("C:/Users/jaden/keys/firebase-admin.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function setAdmin(uid) {
  try {
    await admin.auth().setCustomUserClaims(uid, { admin: true });
    console.log(`✅ ${uid} 사용자에 admin 권한을 부여했습니다.`);
    process.exit(0);
  } catch (e) {
    console.error("❌ 권한 설정 실패:", e);
    process.exit(1);
  }
}

const uid = process.argv[2];
if (!uid) {
  console.error("사용법: node scripts/setAdmin.js <UID>");
  process.exit(1);
}
setAdmin(uid);
