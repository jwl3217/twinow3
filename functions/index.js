require('dotenv').config();
const functions = require('firebase-functions');
const admin     = require('firebase-admin');
const express   = require('express');
const cors      = require('cors');

admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// health-check
app.get('/', (req, res) => res.status(200).send('OK'));

// 라우터 분리
app.use('/api', require('./routes/createPayment'));
app.use(require('./routes/payactionWebhook'));

exports.api = functions.https.onRequest(app);
