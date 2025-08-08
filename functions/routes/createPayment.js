// functions/routes/createPayment.js
const express   = require('express');
const functions = require('firebase-functions');
const router    = express.Router();

const { api_key, mall_id } = functions.config().payaction;

router.post('/createPayment', async (req, res) => {
  const {
    merchantUid,
    amount,
    depositorName,
    buyerPhone,
    buyerEmail,
    cashbillType,
    cashbillIdentifier
  } = req.body;

  if (!merchantUid || !amount || !depositorName || !buyerPhone || !buyerEmail) {
    return res
      .status(400)
      .json({ error: 'merchantUid, amount, depositorName, buyerPhone, buyerEmail을 모두 전달해야 합니다.' });
  }

  const payload = { merchantUid, amount, depositorName, buyerPhone, buyerEmail };
  if (cashbillType)       payload.cashbillType      = cashbillType;
  if (cashbillIdentifier) payload.cashbillIdentifier = cashbillIdentifier;

  try {
    const apiRes = await fetch('https://api.payaction.app/order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key':    api_key,
        'x-mall-id':    mall_id
      },
      body: JSON.stringify(payload)
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
