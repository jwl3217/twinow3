const functions = require('firebase-functions');
const express   = require('express');
const cors      = require('cors');
require('dotenv').config();

const createPayment = require('./routes/createPayment');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());
app.use('/api', createPayment);

exports.api = functions.https.onRequest(app);
