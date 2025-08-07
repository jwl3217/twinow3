const express = require('express');
const router  = express.Router();

// 주문 생성 API
router.post('/createPayment', async (req, res) => {
  // TODO: 실제 PayAction 주문 생성 호출 함수를 구현해주세요
  // 예시: const payment = await fetchPayactionOrder(req.body);
  const payment = await fetchPayactionOrder(req.body);

  // 환경변수에서 내 계좌정보 로드
  const bankInfo = {
    bankName:      process.env.BANK_NAME     || '하나은행',
    accountNumber: process.env.BANK_ACCOUNT  || '31191046973307',
    accountHolder: process.env.BANK_HOLDER   || '이재원',
  };

  // 결제 주문 응답에 합쳐서 반환
  res.json({
    orderNumber:   payment.orderNumber,
    autoCancelAt:  payment.autoCancelAt,
    amount:        payment.amount,
    ...bankInfo
  });
});

module.exports = router;
