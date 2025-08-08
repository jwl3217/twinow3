// functions/routes/createPayment.js
const express = require('express');
const fetch   = require('node-fetch');
require('dotenv').config();

const router = express.Router();

router.post('/createPayment', async (req, res) => {
  const { merchantUid, amount, name } = req.body;
  if (!merchantUid || !amount || !name) {
    return res.status(400).json({ error: 'merchantUid, amount, name을 모두 전달하세요.' });
  }

  try {
    const apiRes = await fetch('https://api.payaction.app/order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key':    process.env.PAYACTION_API_KEY,
        'x-mall-id':    process.env.PAYACTION_MALL_ID
      },
      body: JSON.stringify({ merchantUid, amount, depositName: name })
    });

    const data = await apiRes.json();
    if (!apiRes.ok) {
      return res.status(apiRes.status).json({ error: data.message || '주문 생성 실패', details: data });
    }

    // 주문 생성 성공
    return res.json({ success: true, order: data });
  } catch (err) {
    console.error('createPayment error:', err);
    return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  }
});

module.exports = router;
