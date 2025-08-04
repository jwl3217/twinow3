// 경로: server/routes/pay.js

import express from 'express';
import fetch   from 'node-fetch';
const router = express.Router();

// 운영 모드 키
const CLIENT_KEY = 'R2_e7af7dfe1d684817a588799dbceadc61';
const SECRET_KEY = '23ce497b37ac441487651f3a2e5d9f58';

router.post('/approve', async (req, res) => {
  const { merchantUid, tid } = req.body;
  const authHeader = 'Basic ' +
    Buffer.from(`${CLIENT_KEY}:${SECRET_KEY}`).toString('base64');

  // ─── v1 운영 과금 API 호출 ───
  const resp = await fetch('https://api.nicepay.co.kr/v1/pay', {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type' : 'application/json'
    },
    body: JSON.stringify({ merchantUid, tid })
  });

  const data = await resp.json();
  if (data.resultCode === '0000') {
    // 과금(승인) 성공
    return res.json({ ok: true });
  } else {
    // 승인 실패
    return res.json({ ok: false, error: data.resultMsg });
  }
});

export default router;
