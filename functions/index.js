// functions/index.js
const functions = require('firebase-functions');
const express   = require('express');
const app       = express();

app.use(express.json());                     // ← JSON body 파싱
app.use('/api', require('./routes/createPayment'));

// 1st-Gen 또는 2nd-Gen 설정에 맞춰 onRequest 사용
exports.api = functions
  .region('us-central1')
  .https.onRequest(app);
