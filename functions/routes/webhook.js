const express = require('express');
require('dotenv').config();

const router = express.Router();

router.post('/', (req, res) => {
  const incomingKey = req.get('x-webhook-key');
  const incomingMall = req.get('x-mall-id');

  // 헤더 인증
  if (
    incomingKey !== process.env.PAYACTION_WEBHOOK_KEY ||
    incomingMall !== process.env.PAYACTION_MALL_ID
  ) {
    console.warn('Webhook 인증 실패', incomingKey, incomingMall);
    return res.status(400).json({ status: 'error', message: '인증 실패' });
  }

  const event = req.body;
  console.log('✅ PayAction Webhook event:', JSON.stringify(event, null, 2));

  // TODO: event.status 가 matched/completed 면 DB 업데이트 or 실시간 알림 처리
  // 예) firestore.collection('payments').doc(event.merchant_uid).update({ status: event.status })

  // 페이액션에 “받았음” 알리기
  return res.json({ status: 'success' });
});

module.exports = router;
