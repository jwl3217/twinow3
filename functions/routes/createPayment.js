const express = require('express');
const fetch   = require('node-fetch');
require('dotenv').config();

const router = express.Router();

router.post('/createPayment', async (req, res) => {
  // 프론트에서 넘어오는 모든 필드
  const {
    merchantUid,
    amount,
    depositorName,
    buyerPhone,
    buyerEmail,
    cashbillType,
    cashbillIdentifier
  } = req.body;

  // 필수 체크
  if (!merchantUid || !amount || !depositorName) {
    return res
      .status(400)
      .json({ error: 'merchantUid, amount, depositorName을 모두 전달해야 합니다.' });
  }

  // 페이액션 API에 보낼 payload 조립
  const payload = { merchantUid, amount, depositorName };
  if (buyerPhone)         payload.buyerPhone        = buyerPhone;
  if (buyerEmail)         payload.buyerEmail        = buyerEmail;
  if (cashbillType)       payload.cashbillType      = cashbillType;
  if (cashbillIdentifier) payload.cashbillIdentifier = cashbillIdentifier;

  try {
    const apiRes = await fetch('https://api.payaction.app/order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key':    process.env.PAYACTION_API_KEY,
        'x-mall-id':    process.env.PAYACTION_MALL_ID
      },
      body: JSON.stringify(payload)   // ← 여기 bbody 가 아니라 body 입니다!
    });

    const data = await apiRes.json();
    if (!apiRes.ok) {
      // 페이액션 쪽 에러 메시지를 그대로 내려줍니다.
      return res
        .status(apiRes.status)
        .json({ error: data.message || '주문 생성 실패', details: data });
    }

    // 성공
    return res.json({ success: true, order: data });
  } catch (err) {
    console.error('createPayment error:', err);
    return res
      .status(500)
      .json({ error: '서버 내부 오류가 발생했습니다.' });
  }
});

module.exports = router;
