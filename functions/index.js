// functions/index.js  (ESM)
import { onRequest } from 'firebase-functions/v2/https';
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

// 관리자만 호출 가능: 이메일/비밀번호 계정 생성
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
