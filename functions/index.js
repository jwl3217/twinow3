// functions/index.js
const express = require('express');
const cors    = require('cors');

const { onRequest } = require('firebase-functions/v2/https');
require('dotenv').config();

const createPaymentRouter = require('./routes/createPayment');
// (웹훅 처리 필요 없으면 아래 줄 지워도 됩니다)
// const webhookRouter       = require('./routes/payactionWebhook');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// 주문 생성
app.use('/api', createPaymentRouter);

// 웹훅 엔드포인트 (등록만 해 두시려면 그대로 두세요)
// app.use('/webhook', webhookRouter);

// 2nd Gen v2 방식으로 배포
exports.api = onRequest({ region: 'us-central1' }, app);
