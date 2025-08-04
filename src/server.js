// 경로: server.js

const express    = require('express');
const path       = require('path');
const bodyParser = require('body-parser');
const payRouter  = require('./server/routes/pay');

const app = express();

// JSON 바디 파싱
app.use(bodyParser.json());
// Form-urlencoded 바디 파싱 (POST로 전달된 결제 결과 읽기 위해)
app.use(bodyParser.urlencoded({ extended: false }));

// 승인 API 라우트 (/api/pay/approve)
app.use('/api/pay', payRouter);

// 토스페이/나이스페이 등 결제창에서 리턴할 URL (POST)
// React 라우터가 처리할 수 있도록 쿼리 문자열로 리다이렉트
app.post('/payment/result', (req, res) => {
  const { merchantUid, tid, amount } = req.body;
  const qs = new URLSearchParams({ merchantUid, tid, amount }).toString();
  res.redirect(`/payment/result?${qs}`);
});

// React 빌드 산출물 서빙
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
