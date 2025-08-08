// functions/index.js
const functions = require('firebase-functions');
const express   = require('express');
const cors      = require('cors');

const createPaymentRouter = require('./routes/createPayment');
// (추가로 webhook 등 다른 라우터가 있으면 여기에 require)

const app = express();

// --- 미들웨어 ---
app.use(cors({ origin: true }));
app.use(express.json());

// --- 라우팅 ---
app.use('/api', createPaymentRouter);
// app.use('/api', webhookRouter);  // 웹훅 라우터가 있다면 이렇게

// --- 배포용 엔드포인트 ---
exports.api = functions.https.onRequest(app);
