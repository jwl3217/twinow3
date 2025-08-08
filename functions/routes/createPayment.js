const express = require('express');
const router  = express.Router();

// TODO: 실제 PayAction REST API 호출 로직을 이 함수 안에 구현하세요.
// 예를 들어:
//   const res = await fetch('https://api.payaction.app/order', { … });
//   return await res.json();
async function fetchPayactionOrder({ amount, depositorName }) {
  // 현재는 더미 응답
  return {
    orderNumber:  `pa_${Date.now()}`,                       // 고유 주문번호
    autoCancelAt: Date.now() + 24 * 3600 * 1000,            // 24시간 후 타임스탬프
    amount
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

    // 1) PayAction에 주문 생성 (더미 또는 실제 API 호출)
    const payment = await fetchPayactionOrder({ amount, depositorName });

    // 2) 환경변수 또는 기본값으로 내 계좌 정보 로드
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
