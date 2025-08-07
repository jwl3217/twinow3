const express = require('express');
const router  = express.Router();

// 주문 생성 API
router.post('/createPayment', async (req, res) => {
  // 1) 실제 PayAction 주문 생성 호출
  //    fetchPayactionOrder({ amount, depositorName }) 형태로 구현되어 있다고 가정
  const { amount, depositorName } = req.body;
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
});

module.exports = router;
