const express = require('express');
const router  = express.Router();

const {
  PAYACTION_WEBHOOK_KEY,
  PAYACTION_MALL_ID
} = process.env;

// 웹훅 엔드포인트: POST /webhook/payaction
router.post('/webhook/payaction', (req, res) => {
  const sigKey   = req.header('x-webhook-key');
  const mallId   = req.header('x-mall-id');
  const traceId  = req.header('x-trace-id');
  const event    = req.body; // { eventType, merchantUid, amount, ... }

  // 인증
  if (sigKey !== PAYACTION_WEBHOOK_KEY || mallId !== PAYACTION_MALL_ID) {
    console.warn('⚠️ 잘못된 웹훅 호출:', { sigKey, mallId });
    return res.status(403).json({ status: 'forbidden' });
  }

  console.log(`Webhook[${traceId}] 이벤트 수신:`, event);

  // 예시: 입금 매칭 대기 이벤트 처리
  if (event.eventType === 'order_matching_wait') {
    // TODO: Firestore에 저장하거나, 알림 시스템에 전달
    console.log(`매칭대기 주문: ${event.merchantUid}`);
  }

  // 정상 응답
  res.status(200).json({ status: 'success' });
});

module.exports = router;
