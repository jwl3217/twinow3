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
          // 이미 삭제됨 → 큐 정리
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

// ─────────────────────────────────────────────────────────────
// ★ 페르소나 채팅방 열기(생성/재사용) + CORS 처리
//   POST /openPersonaChat  { postId: string }
//   헤더: Authorization: Bearer <idToken>
// ─────────────────────────────────────────────────────────────
export const openPersonaChat = onRequest({ region: 'us-central1' }, async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST')    return res.status(405).json({ error: 'method_not_allowed' });

  try {
    const authHeader = req.headers.authorization || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken) return res.status(401).json({ error: 'unauthenticated' });

    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    const { postId } = req.body || {};
    if (!postId) return res.status(400).json({ error: 'missing_postId' });

    // 게시글 확인
    const pDoc = await db.collection('posts').doc(postId).get();
    if (!pDoc.exists) return res.status(404).json({ error: 'post_not_found' });
    const pData = pDoc.data() || {};

    if (pData.personaMode !== true) {
      return res.status(400).json({ error: 'not_persona_post' });
    }

    const ADMIN_UID = 'E4d78bGGtnPMvPDl5DLdHx4oRa03';

    // 이미 있는 방 재사용
    const existSnap = await db.collection('chatRooms')
      .where('members', 'array-contains', uid)
      .where('personaPostId', '==', postId)
      .limit(1)
      .get();

    if (!existSnap.empty) {
      return res.status(200).json({ ok: true, roomId: existSnap.docs[0].id });
    }

    // 새 방 생성
    const titleFrom = (txt = '') => {
      const oneline = String(txt).split('\n')[0].trim();
      return oneline.length > 20 ? oneline.slice(0, 20) + '…' : oneline || '게시글';
    };
    const newRef = db.collection('chatRooms').doc();
    await newRef.set({
      members: [uid, ADMIN_UID].sort(),
      lastMessage: '',
      lastAt: admin.firestore.FieldValue.serverTimestamp(),
      unlocked:    { [uid]: false, [ADMIN_UID]: false },
      coins:       { [uid]: 0,     [ADMIN_UID]: 0 },

      // 페르소나 전용 메타
      personaMode:     true,
      personaPostId:   postId,
      personaNickname: pData.nickname || '관리자',
      personaPhotoURL: pData.photoURL || '',
      personaTitle:    titleFrom(pData.content || ''),
      personaExcerpt:  '' // 클라이언트에서 미사용
    });

    return res.status(200).json({ ok: true, roomId: newRef.id });
  } catch (e) {
    logger.error(e);
    return res.status(500).json({ error: 'internal', message: e.message });
  }
});
