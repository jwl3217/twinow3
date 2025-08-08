//사용하지 않음


const express   = require('express');
const functions = require('firebase-functions');

const router = express.Router();
const { webhook_key, mall_id } = functions.config().payaction;

router.post('/', async (req, res) => {
  // 헤더 검증
  if (
    req.headers['x-webhook-key'] !== webhook_key ||
    req.headers['x-mall-id']    !== mall_id
  ) {
    console.warn('Invalid webhook signature or mall id');
    return res.status(403).json({ error: 'Invalid signature' });
  }

  const event = req.body;
  console.log('Webhook received:', event);

  // 예: 매칭 완료 이벤트 처리
  if (event.type === 'matched') {
    // TODO: Firestore나 다른 DB에 주문 상태 업데이트, 코인 충전 로직 등
    // await admin.firestore().doc(`orders/${event.merchantUid}`).update({ status: 'matched' });
  }

  // 정상 수신 응답
  res.json({ status: 'success' });
});

module.exports = router;
