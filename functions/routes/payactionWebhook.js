const express = require('express');
const admin   = require('firebase-admin');
const router  = express.Router();

const WEBHOOK_KEY = process.env.PAYACTION_WEBHOOK_KEY;
const MALL_ID     = process.env.PAYACTION_MALL_ID;

router.post('/webhook/payaction', async (req, res) => {
  const sig  = req.header('x-webhook-key');
  const mall = req.header('x-mall-id');

  if (sig !== WEBHOOK_KEY || mall !== MALL_ID) {
    return res.status(401).json({
      status:  'fail',
      message: 'Invalid webhook key or mall id'
    });
  }

  const { orderId, status, amount, userId } = req.body;
  if (status === 'PAID') {
    try {
      const db      = admin.firestore();
      const userRef = db.doc(`users/${userId}`);
      const snap    = await userRef.get();
      const prev    = snap.exists ? (snap.data().coins || 0) : 0;

      await userRef.update({ coins: prev + Number(amount) });
      return res.json({ status: 'success' });
    } catch (e) {
      console.error('[webhook/payaction] 처리 오류:', e);
      return res.status(500).json({ status: 'fail' });
    }
  }

  res.json({ status: 'ignored' });
});

module.exports = router;
