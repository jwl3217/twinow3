// 경로: server/routes/paymentResult.js

import express from 'express';
const router = express.Router();

// NicePay가 POST로 보내는 결제 결과를 받아
// React 라우터가 처리할 수 있는 GET 쿼리스트링으로 리다이렉트합니다.
router.post('/payment/result', (req, res) => {
  // NicePay 필드명(marchant_uid, merchantUid, orderId) 모두 지원
  const merchantUid = req.body.merchant_uid
                   || req.body.merchantUid
                   || req.body.orderId;
  const tid    = req.body.tid;
  const amount = req.body.amount || req.body.pay_amount || req.body.price;

  // 필수 데이터가 없으면 에러 플래그로 리다이렉트
  if (!merchantUid || !tid) {
    return res.redirect('/payment/result?error=missing');
  }

  const qs = new URLSearchParams({ merchantUid, tid, amount }).toString();
  res.redirect(`/payment/result?${qs}`);
});

export default router;
