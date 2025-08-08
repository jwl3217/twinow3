const express   = require('express');
const functions = require('firebase-functions');

const router = express.Router();

// Firebase CLI 로 세팅한 config 가져오기
const { api_key, mall_id } = functions.config().payaction;

router.post('/createPayment', async (req, res) => {
  const {
    merchantUid,
    amount,
    depositorName,
    buyerPhone,
    buyerEmail,
    cashbillType,
    cashbillIdentifier
  } = req.body;

  // 필수 필드 확인
  if (!merchantUid || !amount || !depositorName) {
    return res
      .status(400)
      .json({ error: 'merchantUid, amount, depositorName을 모두 전달해야 합니다.' });
  }

  // 페이액션으로 보낼 페이로드 조립
  const payload = { merchantUid, amount, depositorName };
  if (buyerPhone)         payload.buyerPhone        = buyerPhone;
  if (buyerEmail)         payload.buyerEmail        = buyerEmail;
  if (cashbillType)       payload.cashbillType      = cashbillType;
  if (cashbillIdentifier) payload.cashbillIdentifier = cashbillIdentifier;

  try {
    // 전역 내장 fetch 사용
    const apiRes = await fetch('https://api.payaction.app/order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key':    api_key,
        'x-mall-id':    mall_id
      },
      body: JSON.stringify(payload)
    });

    const data = await apiRes.json();
    if (!apiRes.ok) {
      // 페이액션이 준 에러 메시지를 그대로 내려줌
      return res
        .status(apiRes.status)
        .json({ error: data.message || '주문 생성 실패', details: data });
    }

    // 성공 응답
    return res.json({ success: true, order: data });
  } catch (err) {
    console.error('💥 createPayment error:', err);
    return res
      .status(500)
      .json({ error: '서버 내부 오류가 발생했습니다.' });
  }
});

module.exports = router;
