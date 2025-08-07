// functions/routes/createPayment.js
const express = require('express');
const router  = express.Router();

// TODO: 실제 PayAction 주문 생성 호출 함수를 구현해주세요.
// 예: const payment = await fetchPayactionOrder({ amount, depositorName });
async function fetchPayactionOrder({ amount, depositorName }) {
  // 여기에 PayAction API 호출 로직 넣으세요.
  // 예시 리턴 값:
  return {
    orderNumber:  `pa_${Date.now()}`,
    autoCancelAt: Date.now() + 24 * 3600 * 1000,
    amount
  };
}

router.post('/createPayment', async (req, res) => {
  try {
    const { amount, depositorName } = req.body;
    if (!amount || !depositorName) {
      return res.status(400).json({ error: 'amount, depositorName 둘 다 필요합니다' });
    }

    // 1) 실제 PayAction 주문 생성
    const payment = await fetchPayactionOrder({ amount, depositorName });

    // 2) 환경변수에서 내 계좌정보 로드
    const bankInfo = {
      bankName:      process.env.BANK_NAME     || '하나은행',
      accountNumber: process.env.BANK_ACCOUNT  || '31191046973307',
      accountHolder: process.env.BANK_HOLDER   || '이재원',
    };

    // 3) 클라이언트에 필요한 값만 합쳐서 반환
    res.json({
      orderNumber:   payment.orderNumber,
      autoCancelAt:  payment.autoCancelAt,
      amount:        payment.amount,
      ...bankInfo
    });
  } catch (err) {
    console.error('[/createPayment] 오류:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

module.exports = router;
