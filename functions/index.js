// functions/index.js
const functions = require('firebase-functions');
const admin     = require('firebase-admin');
const express   = require('express');
const cors      = require('cors');
require('dotenv').config();

admin.initializeApp();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// health-check
app.get('/', (req, res) => res.status(200).send('OK'));

// 결제 주문 생성 라우터 (파일: routes/createPayment.js)
app.use('/api', require('./routes/createPayment'));

// 웹훅 수신 라우터 (파일: routes/payactionWebhook.js)
app.use(require('./routes/payactionWebhook'));

exports.api = functions.https.onRequest(app);
