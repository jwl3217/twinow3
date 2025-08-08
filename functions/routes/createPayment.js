// functions/routes/createPayment.js
const express = require('express');
const fetch   = require('node-fetch');
const router  = express.Router();

// 실제 PayAction 주문 생성 호출
async function fetchPayactionOrder({ amount, depositorName }) {
  const res = await fetch('https://api.payaction.app/order', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key':     process.env.PAYACTION_API_KEY,
      'x-mall-id':     process.env.PAYACTION_MALL_ID
    },
    body: JSON.stringify({
      amount, 
      depositorName
    })
  });
  const data = await res.json();
  if (!res.ok) {
    console.error('[PayAction 주문생성 오류]', data);
    throw new Error(data.error || `PayAction 주문 생성 실패 (status ${res.status})`);
  }
  // data.autoCancelAt 은 ISO8601 문자열 또는 ms 타임스탬프일 수 있습니다.
  return {
    orderNumber:  data.orderId,
    autoCancelAt: new Date(data.autoCancelAt).getTime(),
    amount:       data.amount
  };
}

router.post('/createPayment', async (req, res) => {
  try {
    const { amount, depositorName } = req.body;
    if (!amount || !depositorName) {
      return res
        .status(400)
        .json({ error: 'amount와 depositorName을 모두 전달해야 합니다.' });
    }

    // 1) PayAction에 실제 주문 생성
    const payment = await fetchPayactionOrder({ amount, depositorName });

    // 2) 내 계좌 정보 (환경변수 또는 기본값)
    const bankInfo = {
      bankName:      process.env.BANK_NAME     || '하나은행',
      accountNumber: process.env.BANK_ACCOUNT  || '31191046973307',
      accountHolder: process.env.BANK_HOLDER   || '이재원',
    };

    // 3) 클라이언트에 JSON 응답
    return res.json({
      orderNumber:  payment.orderNumber,
      autoCancelAt: payment.autoCancelAt,
      amount:       payment.amount,
      ...bankInfo
    });
  } catch (err) {
    console.error('[/createPayment] 서버 오류:', err);
    return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  }
});

module.exports = router;
