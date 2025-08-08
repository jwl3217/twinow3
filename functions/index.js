const functions = require('firebase-functions');
const express   = require('express');
const cors      = require('cors');

const createPaymentRouter = require('./routes/createPayment');
const webhookRouter       = require('./routes/webhook');

const app = express();

// CORS 열기
app.use(cors({ origin: true }));
// JSON 본문 파싱
app.use(express.json());

// 라우트 등록
app.use('/api', createPaymentRouter);
app.use('/api', webhookRouter);

// Cloud Functions 로 배포
exports.api = functions.https.onRequest(app);
