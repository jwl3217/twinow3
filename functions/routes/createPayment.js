const express   = require('express');
const fetch     = require('node-fetch');
const router    = express.Router();

const { PAYACTION_API_KEY, PAYACTION_MALL_ID } = process.env;
if (!PAYACTION_API_KEY || !PAYACTION_MALL_ID) {
  console.error('⚠️ Missing PAYACTION_API_KEY or PAYACTION_MALL_ID');
}

// 주문 생성 엔드포인트
// 클라이언트에서 POST /api/order { merchantUid, amount, … }
router.post('/order', async (req, res) => {
  const { merchantUid, amount } = req.body;
  if (!merchantUid || !amount) {
    return res.status(400).json({ error: 'merchantUid와 amount를 모두 전달해야 합니다' });
  }

  try {
    const response = await fetch('https://api.payaction.app/order', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'x-api-key':     PAYACTION_API_KEY,
        'x-mall-id':     PAYACTION_MALL_ID,
      },
      body: JSON.stringify({ merchantUid, amount })
    });
    const data = await response.json();
    if (response.ok) {
      return res.json({ success: true, data });
    }
    return res.status(response.status).json({ error: data.message || '주문 생성 실패' });
  } catch (err) {
    console.error('주문 생성 오류:', err);
    return res.status(500).json({ error: '서버 내부 오류' });
  }
});

module.exports = router;
