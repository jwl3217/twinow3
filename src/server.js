// server.js

const express    = require('express');
const path       = require('path');
const bodyParser = require('body-parser');

const app = express();

// 1) 바디 파싱 설정
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// 2) React 빌드 결과물 서빙
app.use(express.static(path.join(__dirname, 'build')));

// 3) SPA 핸들링: 그 외 모든 GET 요청은 index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// 서버 시작
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`▶ Server running on port ${PORT}`);
});
