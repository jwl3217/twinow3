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
// NicePay가 POST로 보내는 필드명(merchant_uid, merchantUid, orderId)에 대응해서
// React 라우터가 처리할 수 있는 쿼리스트링으로 리다이렉트합니다.
app.post('/payment/result', (req, res) => {
  const merchantUid = req.body.merchant_uid || req.body.merchantUid || req.body.orderId;
  const tid         = req.body.tid;
  const amount      = req.body.amount || req.body.pay_amount || req.body.price;

  if (!merchantUid || !tid) {
    // 정보가 부족하면 React 쪽에서 에러 처리
    return res.redirect('/payment/result?error=missing');
  }

  const qs = new URLSearchParams({ merchantUid, tid, amount }).toString();
  res.redirect(`/payment/result?${qs}`);
});

// React 빌드 결과물 서빙
app.use(express.static(path.join(__dirname, 'build')));

// SPA 라우팅: 나머지 GET 요청은 모두 index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// 포트 설정 및 서버 시작
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`▶ Server running on port ${PORT}`);
});
