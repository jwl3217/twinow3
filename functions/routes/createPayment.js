const express = require('express');
const fetch   = require('node-fetch');
const router  = express.Router();

router.post('/createPayment', async (req, res) => {
  // body 로 받아야 합니다!
  const {
    merchantUid,
    amount,
    depositorName,
    buyerPhone,
    buyerEmail,
    cashbillType,        // ex: "소득공제" or "지출증빙"
    cashbillIdentifier   // 휴대폰 번호나 사업자번호
  } = req.body;

  // 필수 항목 전부 검사
  if (
    !merchantUid ||
    !amount ||
    !depositorName ||
    !buyerPhone ||
    !buyerEmail
  ) {
    return res.status(400).json({
      error: 'merchantUid, amount, depositorName, buyerPhone, buyerEmail을 모두 전달해야 합니다.'
    });
  }

  // 현금영수증 옵션이 필요 없으면 cashbillType/identifier는 생략 가능
  const payload = {
    merchantUid,
    amount,
    depositorName,
    buyerPhone,
    buyerEmail
  };
  if (cashbillType && cashbillIdentifier) {
    payload.cashbill = {
      type:       cashbillType,
      identifier: cashbillIdentifier
    };
  }

  try {
    const apiRes = await fetch('https://api.payaction.app/order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key':    process.env.PAYACTION_API_KEY,
        'x-mall-id':    process.env.PAYACTION_MALL_ID
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
