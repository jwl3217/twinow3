const functions = require('firebase-functions');
const express   = require('express');
const cors      = require('cors');
require('dotenv').config();

const createPayment = require('./routes/createPayment');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// 이 줄이 있어야 /api/createPayment 로 매핑됩니다
app.use('/api', createPayment);

exports.api = functions
  .https.onRequest(app);
