// server/routes/createPayment.js (예시)
import express from 'express';
const router = express.Router();

router.post('/createPayment', async (req, res) => {
  // 1) PayAction API 호출해서 order 생성
  // const payment = await fetchPayactionOrder(...);

  // 2) 환경변수에서 내 계좌정보 로드
  const bankInfo = {
    bankName:      process.env.BANK_NAME     || '하나은행',
    accountNumber: process.env.BANK_ACCOUNT  || '31191046973307',
    accountHolder: process.env.BANK_HOLDER   || '이재원',
  };

  // 3) 결제 주문 응답에 합쳐서 반환
  return res.json({
    orderNumber:   payment.orderNumber,
    autoCancelAt:  payment.autoCancelAt,
    amount:        payment.amount,
    ...bankInfo
  });
});

export default router;
