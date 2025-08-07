// 경로: server/routes/payactionWebhook.js

import express from 'express';
import fetch   from 'node-fetch';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db }               from '../firebaseConfig'; // 재사용 가능하다면

const router = express.Router();

// Webhook 수신 (Express app 에 bodyParser.urlencoded/json 설정 필요)
router.post('/payaction/webhook', async (req, res) => {
  const sig   = req.header('x-webhook-key');
  const mall  = req.header('x-mall-id');
  // 인증키 검증
  if (sig !== 'N3HQX68KSTY9' || mall !== '1754495682975x949667080623358000') {
    return res.status(401).json({ status: 'fail', message: 'Invalid webhook key' });
  }

  const { orderId, status, amount, userId } = req.body;
  // status가 'PAID'일 때만 처리
  if (status === 'PAID') {
    try {
      // 예: 주문에 대응되는 사용자 ID(userId) 알아낸 뒤 코인 충전
      // 여기서는 userId 필드를 webhook payload 에서 함께 보내야 합니다.
      const userRef = doc(db, 'users', userId);
      const snap    = await getDoc(userRef);
      const prev    = snap.data()?.coins || 0;
      await updateDoc(userRef, { coins: prev + Number(amount) });

      res.json({ status: 'success' });
    } catch (e) {
      console.error('Webhook 처리 오류:', e);
      res.status(500).json({ status: 'fail' });
    }
  } else {
    // 입금 대기, 취소 등 다른 이벤트
    res.json({ status: 'ignored' });
  }
});

export default router;
