// functions/index.js
const admin    = require('firebase-admin');
const express  = require('express');
const cors     = require('cors');
const { onRequest } = require('firebase-functions/v2/https');

admin.initializeApp();

const createPaymentRouter    = require('./routes/createPayment');
const payactionWebhookRouter = require('./routes/payactionWebhook');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.get('/', (req, res) => res.status(200).send('OK'));
app.use('/api',     createPaymentRouter);
app.use('/webhook', payactionWebhookRouter);

// Gen-2 함수로 export
exports.api = onRequest({ region: 'us-central1' }, app);
