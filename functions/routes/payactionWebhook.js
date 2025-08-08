// functions/routes/payactionWebhook.js
const express = require('express');
require('dotenv').config();

const router = express.Router();

// PayAction 에서 입금매칭 완료 이벤트가 날아오는 엔드포인트
router.post('/webhook/payaction', async (req, res) => {
  const incomingKey  = req.headers['x-webhook-key'];
  const incomingMall = req.headers['x-mall-id'];

  // 인증 체크
  if (
    incomingKey  !== process.env.PAYACTION_WEBHOOK_KEY ||
    incomingMall !== process.env.PAYACTION_MALL_ID
  ) {
    console.warn('Invalid webhook auth', incomingKey, incomingMall);
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }

  const event = req.body;
  console.log('▶ PayAction Webhook event:', JSON.stringify(event));

  // 예: event.type === 'matching_complete' 또는 event.data.status === 'matched'
  if (event.type === 'matching_complete' || event.data?.status === 'matched') {
    const { merchantUid, amount, depositName } = event.data;
    // TODO: DB에 주문 상태 업데이트, 사용자 코인 충전 처리 등
    console.log(`✅ 주문 매칭 완료: ${merchantUid} (${depositName}님 ${amount}원)`);
  }

  // 성공 응답
  res.json({ status: 'success' });
});

module.exports = router;
