// 경로: server.js

const express    = require('express');
const path       = require('path');
const bodyParser = require('body-parser');
const payRouter  = require('./server/routes/pay');

const app = express();

// JSON 바디 파싱
app.use(bodyParser.json());
// Form-urlencoded 파싱 (NicePay POST 결과 읽기)
app.use(bodyParser.urlencoded({ extended: false }));

// 승인 API 라우트 (/api/pay/approve)
app.use('/api/pay', payRouter);

// 결제 결과 리턴 URL (POST)
// NicePay가 POST로 보내는 orderId, tid, amount 받아
// React 라우터가 처리하는 GET 쿼리로 리다이렉트
app.post('/payment/result', (req, res) => {
  const { orderId, tid, amount } = req.body;
  const qs = new URLSearchParams({
    merchantUid: orderId,  // NicePay는 orderId 필드로 보냄
    tid,
    amount
  }).toString();
  res.redirect(`/payment/result?${qs}`);
});

// React 빌드 결과물 서빙
app.use(express.static(path.join(__dirname, 'build')));

// 기타 모든 GET 요청도 index.html 로 포워딩
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// 포트 설정
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`▶ Server running on port ${PORT}`);
});
