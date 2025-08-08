// functions/routes/createPayment.js
const express = require('express');
const fetch   = require('node-fetch');
require('dotenv').config();

const router = express.Router();

// POST /api/createPayment
router.post('/createPayment', async (req, res) => {
  const { merchantUid, amount, depositorName } = req.body;
  if (!merchantUid || !amount || !depositorName) {
    return res.status(400).json({
      error: 'merchantUid, amount, depositorName을 모두 전달해야 합니다.'
    });
  }

  // Payaction API 요구 스펙에 맞춰 snake_case 로 변환
  const payload = {
    merchant_uid:     merchantUid,
    amount,                             // 그대로 사용
    depositor_name:   depositorName
  };

  try {
    const apiRes = await fetch('https://api.payaction.app/order', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key':    process.env.PAYACTION_API_KEY,
        'x-mall-id':    process.env.PAYACTION_MALL_ID
      },
      body: JSON.stringify(payload)   // ← 여기 꼭 body로!
    });

    const data = await apiRes.json();
    if (!apiRes.ok) {
      return res
        .status(apiRes.status)
        .json({ error: data.message || '주문 생성 실패', details: data });
    }

    return res.json({ success: true, order: data });
  } catch (err) {
    console.error('createPayment error:', err);
    return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  }
});

module.exports = router;
