const express = require('express');
const fetch   = require('node-fetch');
const router  = express.Router();

// 환경변수에서 읽어오기
const PAYACTION_API_KEY = process.env.PAYACTION_API_KEY;
const PAYACTION_MALL_ID = process.env.PAYACTION_MALL_ID;
const BANK_NAME         = process.env.BANK_NAME     || '하나은행';
const BANK_ACCOUNT      = process.env.BANK_ACCOUNT  || '31191046973307';
const BANK_HOLDER       = process.env.BANK_HOLDER   || '이재원';

async function fetchPayactionOrder({ amount, depositorName }) {
  const response = await fetch('https://api.payaction.app/order', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key':     PAYACTION_API_KEY,
      'x-mall-id':     PAYACTION_MALL_ID
    },
    body: JSON.stringify({ amount, depositorName })
  });

  const data = await response.json();
  if (!response.ok) {
    console.error('[PayAction 주문생성 오류]', data);
    throw new Error(data.error || data.message || `status ${response.status}`);
  }

  const autoCancelAt = typeof data.autoCancelAt === 'number'
    ? data.autoCancelAt
    : Date.parse(data.autoCancelAt);

  return {
    orderNumber:  data.orderId || data.orderNumber,
    autoCancelAt,
    amount:       data.amount
  };
}

router.post('/createPayment', async (req, res) => {
  try {
    const { amount, depositorName } = req.body;
    if (!amount || !depositorName) {
      return res.status(400).json({ error: 'amount와 depositorName을 모두 전달해야 합니다.' });
    }

    const payment = await fetchPayactionOrder({ amount, depositorName });

    const bankInfo = {
      bankName:      BANK_NAME,
      accountNumber: BANK_ACCOUNT,
      accountHolder: BANK_HOLDER
    };

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
