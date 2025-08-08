// functions/routes/createPayment.js
const express = require('express');
const axios   = require('axios');
const functions = require('firebase-functions');

const router = express.Router();
const { api_key, mall_id } = functions.config().payaction;

router.post('/createPayment', async (req, res) => {
  const { merchantUid, amount, depositorName } = req.body;
  if (!merchantUid || !amount || !depositorName) {
    return res.status(400).json({
      error: 'merchantUid, amount, depositorName을 모두 전달해야 합니다.'
    });
  }

  try {
    const response = await axios.post(
      'https://api.payaction.app/order',
      { merchantUid, amount, depositorName },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': api_key,
          'x-mall-id': mall_id
        }
      }
    );
    return res.json({ success: true, order: response.data });
  } catch (err) {
    console.error('createPayment error', err.response || err);
    if (err.response) {
      return res
        .status(err.response.status)
        .json({ error: err.response.data.message || '주문 생성 실패', details: err.response.data });
    }
    return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  }
});

module.exports = router;
