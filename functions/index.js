const functions = require('firebase-functions');
const express   = require('express');
const cors      = require('cors');
require('dotenv').config();

const createPaymentRouter = require('./routes/createPayment');
const webhookRouter       = require('./routes/webhook');

const app = express();

// CORS 설정
app.use(cors({ origin: true }));
// JSON body 파싱
app.use(express.json());

// 라우터 등록
app.use('/api', createPaymentRouter);
app.use('/api', webhookRouter);

// 배포할 함수 export
exports.api = functions
  .https
  .onRequest(app);
