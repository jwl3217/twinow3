// functions/routes/createPayment.js
const express = require('express');
const fetch   = require('node-fetch');
require('dotenv').config();

const router = express.Router();

router.post('/createPayment', async (req, res) => {
  const { merchantUid, amount, depositorName } = req.body;
  if (!merchantUid || !amount || !depositorName) {
    return res
      .status(400)
      .json({ error: 'merchantUid, amount, depositorName을 모두 전달해야 합니다.' });
  }

  try {
    const apiRes = await fetch('https://api.payaction.app/order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key':     process.env.PAYACTION_API_KEY,
        'x-mall-id':     process.env.PAYACTION_MALL_ID,
      },
      body: JSON.stringify({ merchantUid, amount, depositorName })
    });
    const data = await apiRes.json();

    // Payaction이 error status를 리턴하면 에러 처리
    if (data.status !== 'success') {
      return res
        .status(500)
        .json({
          error:   data.response?.message || '주문 생성 실패',
          details: data.response
        });
    }

    return res.json({ success: true, order: data.response });
  } catch (err) {
    console.error('createPayment error:', err);
    return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  }
});

module.exports = router;
