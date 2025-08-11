// functions/index.js  (ESM)
import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
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
// 관리자 전용: 이메일/비번 계정 생성(변경 없음)
// ─────────────────────────────────────────────────────────────
export const createUser = onRequest({ region: 'us-central1' }, async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST')    return res.status(405).json({ error: 'method_not_allowed' });

  try {
    const authHeader = req.headers.authorization || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken) return res.status(401).json({ error: 'unauthenticated' });

    const decoded = await admin.auth().verifyIdToken(idToken);
    if (!decoded.admin) return res.status(403).json({ error: 'forbidden' });

    const { email, password, displayName } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'missing_fields' });

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
// ★ 탈퇴 예약: 기본 24시간 뒤 Auth 삭제
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

    const targetUid = bodyUid || decoded.uid;
    const callerIsAdmin = !!decoded.admin;
    if (!callerIsAdmin && decoded.uid !== targetUid) {
      return res.status(403).json({ error: 'forbidden' });
    }

    const hours = Number.isFinite(afterHours) ? Math.max(1, Number(afterHours)) : 24; // ★ 24h
    const whenAt = Date.now() + hours * 60 * 60 * 1000;

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
// 30분마다 실행: 기한 지난 예약 Auth 삭제
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
      } catch (e) {
        if (e && e.code === 'auth/user-not-found') {
          // 이미 삭제됨
        } else {
          // 실패 → 다음 주기에 재시도(문서 유지)
          continue;
        }
      }
      batch.delete(docSnap.ref);
    }
    await batch.commit();
  }
);
