const express = require('express');
const router  = express.Router();

// PayAction 무통장(Webhook) 처리
router.post('/webhook/payaction', async (req, res) => {
  const sig  = req.header('x-webhook-key');
  const mall = req.header('x-mall-id');

  // 인증키 검증
  if (sig !== 'N3HQX68KSTY9'
   || mall !== '1754495682975x949667080623358000') {
    return res.status(401).json({ status: 'fail', message: 'Invalid webhook key' });
  }

  const { orderId, status, amount, userId } = req.body;
  if (status === 'PAID') {
    try {
      const adminDb = require('firebase-admin').firestore();
      const userRef = adminDb.doc(`users/${userId}`);
      const snap    = await userRef.get();
      const prev    = snap.data()?.coins || 0;
      await userRef.update({ coins: prev + Number(amount) });
      return res.json({ status: 'success' });
    } catch (e) {
      console.error('Webhook 처리 오류:', e);
      return res.status(500).json({ status: 'fail' });
    }
  }

  // 기타 상태는 무시
  res.json({ status: 'ignored' });
});

module.exports = router;
