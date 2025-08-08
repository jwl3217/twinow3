// functions/routes/createPayment.js
const express = require('express');
const fetch   = require('node-fetch');
require('dotenv').config();

const router = express.Router();

router.post('/createPayment', async (req, res) => {
  const { amount, depositorName } = req.body;
  const merchantUid = req.body.merchantUid || `MO-${Date.now()}`;

  if (!amount || !depositorName) {
    return res
      .status(400)
      .json({ error: 'amount와 depositorName을 모두 전달해야 합니다.' });
  }

  try {
    const apiRes = await fetch('https://api.payaction.app/order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key':    process.env.PAYACTION_API_KEY,
        'x-mall-id':    process.env.PAYACTION_MALL_ID
      },
      body: JSON.stringify({
        merchant_uid:    merchantUid,       // ← snake_case 로 변경
        amount:          amount,
        depositor_name:  depositorName      // ← snake_case 로 변경
      })
    });

    const data = await apiRes.json();

    // PayAction 자체 status 체크
    if (data.status !== 'success') {
      return res
        .status(400)
        .json({ error: data.response?.message || '주문 생성 실패', details: data });
    }

    return res.json({ success: true, order: data.response });

  } catch (err) {
    console.error('createPayment error:', err);
    return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  }
});

module.exports = router;
