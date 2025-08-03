// server/routes/paymentResult.js
import express from 'express';
const router = express.Router();

router.post('/payment/result', (req, res) => {
  // 결제 결과(req.body)를 검증·로그 저장 등 처리
  // 클라이언트(브라우저)로 간단히 리다이렉트
  res.redirect('/payment/success');
});

export default router;
