// functions/index.js  (ESM)
import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';   // ★ 추가
import * as logger from 'firebase-functions/logger';
import admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://twinow.kr',
];

function setCors(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
  }
  res.set('Vary', 'Origin');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// ─────────────────────────────────────────────────────────────
// 기존: 관리자만 호출 가능 - 이메일/비밀번호 계정 생성 (변경 없음)
// ─────────────────────────────────────────────────────────────
export const createUser = onRequest({ region: 'us-central1' }, async (req, res) => {
  setCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  try {
    // 관리자 검증 (Bearer ID 토큰 필요)
    const authHeader = req.headers.authorization || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken) return res.status(401).json({ error: 'unauthenticated' });

    const decoded = await admin.auth().verifyIdToken(idToken);
    if (!decoded.admin) return res.status(403).json({ error: 'forbidden' });

    const { email, password, displayName } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'missing_fields' });
    }

    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: displayName || undefined,
      emailVerified: false,
      disabled: false,
    });

    await db.collection('users').doc(userRecord.uid).set({
      email,
      nickname: displayName || '',
      coins: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(200).json({ ok: true, uid: userRecord.uid });
  } catch (e) {
    logger.error(e);
    return res.status(500).json({ error: 'internal', message: e.message });
  }
});

// ─────────────────────────────────────────────────────────────
// ★ 추가 1) 탈퇴 예약 등록 HTTPS 함수
// - 본인 또는 admin만 등록 가능
// - 기본 3일 뒤(72시간) 삭제 큐에 올림
// - Frontend에서 탈퇴 시 deleteUser() 대신 이 엔드포인트를 호출
//   (uid 생략 시 토큰의 본인 uid로 처리)
//   POST /queueAuthDeletion  { afterHours?: number, uid?: string }
// ─────────────────────────────────────────────────────────────
export const queueAuthDeletion = onRequest({ region: 'us-central1' }, async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST')    return res.status(405).json({ error: 'method_not_allowed' });

  try {
    const authHeader = req.headers.authorization || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken) return res.status(401).json({ error: 'unauthenticated' });

    const decoded = await admin.auth().verifyIdToken(idToken);
    const { afterHours, uid: bodyUid } = req.body || {};

    const targetUid = bodyUid || decoded.uid;                  // 본인 기본
    const callerIsAdmin = !!decoded.admin;
    if (!callerIsAdmin && decoded.uid !== targetUid) {
      return res.status(403).json({ error: 'forbidden' });
    }

    const hours = Number.isFinite(afterHours) ? Math.max(1, Number(afterHours)) : 72; // 기본 72h = 3일
    const whenAt = Date.now() + hours * 60 * 60 * 1000;

    // 문서ID를 uid로 고정 → 덮어쓰기(연장/갱신) 가능
    await db.collection('scheduledAuthDelete').doc(targetUid).set({
      uid: targetUid,
      whenAt,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return res.status(200).json({ ok: true, uid: targetUid, whenAt });
  } catch (e) {
    logger.error(e);
    return res.status(500).json({ error: 'internal', message: e.message });
  }
});

// ─────────────────────────────────────────────────────────────
// ★ 추가 2) 30분마다 실행되는 스케줄러
// - scheduledAuthDelete 에서 whenAt 경과한 항목을 가져와 Auth에서 삭제
// - 성공/존재하지 않음 → 레코드 정리
// ─────────────────────────────────────────────────────────────
export const cronDeleteAuthUsers = onSchedule(
  { region: 'us-central1', schedule: 'every 30 minutes' },
  async () => {
    const now = Date.now();
    const snap = await db.collection('scheduledAuthDelete')
      .where('whenAt', '<=', now)
      .limit(100)
      .get();

    if (snap.empty) return;

    const batch = db.batch();
    for (const docSnap of snap.docs) {
      const { uid } = docSnap.data() || {};
      if (!uid) {
        batch.delete(docSnap.ref);
        continue;
      }
      try {
        await admin.auth().deleteUser(uid);
        logger.info(`Deleted auth user: ${uid}`);
      } catch (e) {
        // 이미 삭제된 계정이어도 큐 정리
        if (e && e.code === 'auth/user-not-found') {
          logger.warn(`User not found at deletion time: ${uid}`);
        } else {
          logger.error(`Failed to delete user ${uid}:`, e);
          // 실패 시 다음 주기에 재시도할 수 있도록 문서 유지하고 continue
          continue;
        }
      }
      // 성공 또는 not-found → 큐에서 제거
      batch.delete(docSnap.ref);
    }
    await batch.commit();
  }
);
