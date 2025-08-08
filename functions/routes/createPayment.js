// functions/routes/createPayment.js
const express = require('express');
const fetch   = require('node-fetch');
const functions = require('firebase-functions');
require('dotenv').config();

const router = express.Router();

// 환경변수 우선, 없으면 Firebase functions.config().payaction 로 fallback
const PAYACTION_API_KEY = process.env.PAYACTION_API_KEY || functions.config().payaction.api_key;
const PAYACTION_MALL_ID = process.env.PAYACTION_MALL_ID || functions.config().payaction.mall_id;

router.post('/createPayment', async (req, res) => {
  const { merchantUid, amount, depositorName } = req.body;
  if (!merchantUid || !amount || !depositorName) {
    return res.status(400).json({
      error: 'merchantUid, amount, depositorName을 모두 전달해야 합니다.'
    });
  }

  try {
    console.log('createPayment 호출:', { merchantUid, amount, depositorName });
    console.log('헤더로 전송되는 API_KEY, MALL_ID:', PAYACTION_API_KEY, PAYACTION_MALL_ID);

    const apiRes = await fetch('https://api.payaction.app/order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key':     PAYACTION_API_KEY,
        'x-mall-id':     PAYACTION_MALL_ID
      },
      body: JSON.stringify({ merchantUid, amount, depositorName })
    });

    let data;
    try {
      data = await apiRes.json();
    } catch (parseErr) {
      console.error('페이액션 응답 JSON 파싱 실패:', parseErr);
      return res.status(502).json({ error: '페이액션 응답 파싱 에러' });
    }

    console.log('페이액션 응답:', data);

    if (!apiRes.ok) {
      // HTTP 400~500 대 응답은 그대로 클라이언트로 전달
      return res.status(apiRes.status).json({
        error: data.resultMsg || data.message || '주문 생성 실패',
        details: data
      });
    }

    // 주문 생성 성공
    return res.json({ success: true, order: data });
  } catch (err) {
    console.error('createPayment error:', err);
    return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  }
});

module.exports = router;
