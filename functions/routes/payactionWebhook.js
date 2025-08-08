const express = require('express');
const router  = express.Router();
const admin   = require('firebase-admin');

// PayAction 무통장(Webhook) 처리
router.post('/webhook/payaction', async (req, res) => {
  // 1) 요청 헤더에서 키 검증
  const sig  = req.header('x-webhook-key');
  const mall = req.header('x-mall-id');

  // 환경변수에 설정한 값과 비교
  if (
    sig  !== process.env.PAYACTION_WEBHOOK_KEY ||
    mall !== process.env.PAYACTION_MALL_ID
  ) {
    return res.status(401).json({
      status:  'fail',
      message: 'Invalid webhook key or mall id'
    });
  }

  // 2) 페이액션이 보낸 본문 파싱
  const { orderId, status, amount, userId } = req.body;
  if (status === 'PAID') {
    try {
      // 3) 결제 완료 시 유저 코인 충전
      const db      = admin.firestore();
      const userRef = db.doc(`users/${userId}`);
      const snap    = await userRef.get();
      const prev    = snap.exists ? (snap.data().coins || 0) : 0;

      await userRef.update({
        coins: prev + Number(amount)
      });

      return res.json({ status: 'success' });
    } catch (e) {
      console.error('[webhook/payaction] 처리 오류:', e);
      return res.status(500).json({ status: 'fail' });
    }
  }

  // 4) 그 외 상태는 무시
  res.json({ status: 'ignored' });
});

module.exports = router;
