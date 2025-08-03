// 경로: server.js

const express    = require('express');
const path       = require('path');
const bodyParser = require('body-parser');
const payRouter  = require('./server/routes/pay');

const app = express();

// JSON 바디 파싱
app.use(bodyParser.json());

// 승인 API 라우트 (/api/pay/approve)
app.use('/api/pay', payRouter);

// 토스페이/나이스페이 등 결제창에서 리턴할 URL (POST)
// React 라우터가 처리할 수 있도록 index.html 을 내보냅니다.
app.post('/payment/result', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
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
