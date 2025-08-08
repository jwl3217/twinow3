const functions = require('firebase-functions');
const express   = require('express');
const cors      = require('cors');

const createPaymentRouter = require('./routes/createPayment');
const webhookRouter       = require('./routes/webhook');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// 주문 생성 엔드포인트
app.use('/createPayment', createPaymentRouter);

// 페이액션 입금/매칭 웹훅 엔드포인트
app.use('/webhook', webhookRouter);

exports.api = functions.https.onRequest(app);
