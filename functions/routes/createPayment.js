// functions/routes/createPayment.js
const express = require('express');
const fetch   = require('node-fetch');
require('dotenv').config();

const router = express.Router();

router.post('/createPayment', async (req, res) => {
  const { merchantUid, amount, depositorName } = req.body;
  if (!merchantUid || !amount || !depositorName) {
    return res.status(400).json({ error: 'merchantUid, amount, depositorName을 모두 전달해야 합니다.' });
  }

  try {
    const apiRes = await fetch('https://api.payaction.app/order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key':    process.env.PAYACTION_API_KEY,
        'x-mall-id':    process.env.PAYACTION_MALL_ID
      },
      body: JSON.stringify({ merchantUid, amount, depositorName })  // <-- fixed here
    });

    const data = await apiRes.json();
    if (!apiRes.ok) {
      console.error('PayAction 주문 생성 실패:', data);
      return res.status(apiRes.status).json({
        error:    data.error || data.message || '주문 생성 실패',
        details:  data
      });
    }

    // 성공 시 생성된 주문 정보 리턴
    return res.json({ success: true, order: data });
  } catch (err) {
    console.error('createPayment error:', err);
    return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  }
});

module.exports = router;
