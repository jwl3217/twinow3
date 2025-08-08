const functions = require('firebase-functions');
const express   = require('express');
const cors      = require('cors');
require('dotenv').config();

const createPayment = require('./routes/createPayment');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.use('/api', createPayment);

// 1st-gen 함수: region() 없이 바로 onRequest 사용
exports.api = functions
  .https.onRequest(app);
