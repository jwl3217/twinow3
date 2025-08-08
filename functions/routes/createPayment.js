// functions/routes/createPayment.js
const express = require('express');
const functions = require('firebase-functions');
require('dotenv').config();  // 로컬에서 .env 읽을 때만 유효

const router = express.Router();

// 로컬 .env 또는 Firebase 환경설정에서 불러오기
const API_KEY = process.env.PAYACTION_API_KEY || functions.config().payaction.api_key;
const MALL_ID = process.env.PAYACTION_MALL_ID || functions.config().payaction.mall_id;

router.post('/createPayment', async (req, res) => {
  const { merchantUid, amount, depositorName } = req.body;
  if (!merchantUid || !amount || !depositorName) {
    return res.status(400).json({
      error: 'merchantUid, amount, depositorName을 모두 전달해야 합니다.'
    });
  }

  // 키 확인
  if (!API_KEY || !MALL_ID) {
    console.error('Missing PayAction credentials', { API_KEY, MALL_ID });
    return res.status(500).json({ error: '결제 서버 설정이 올바르지 않습니다.' });
  }

  try {
    // Node18+ 의 글로벌 fetch 사용 (없으면 node-fetch에서 default 추출)
    const fetchFn = typeof fetch === 'function'
      ? fetch
      : require('node-fetch').default;

    const apiRes = await fetchFn('https://api.payaction.app/order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key':    API_KEY,
        'x-mall-id':    MALL_ID
      },
      body: JSON.stringify({ merchantUid, amount, depositorName })
    });

    const data = await apiRes.json();

    if (!apiRes.ok) {
      console.error('PayAction 주문 생성 실패:', data);
      return res.status(apiRes.status).json({
        error:   data.error || data.message || '주문 생성 실패',
        details: data
      });
    }

    // 성공 리턴
    return res.json({ success: true, order: data });
  } catch (err) {
    console.error('createPayment error:', err);
    return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  }
});

module.exports = router;
