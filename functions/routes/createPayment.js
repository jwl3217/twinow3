const express = require('express');
const fetch   = require('node-fetch');
require('dotenv').config();

const router = express.Router();

router.post('/', async (req, res) => {
  const { amount, depositorName } = req.body;
  // merchantUid를 클라이언트에서 안보내면 서버에서 생성
  const merchantUid = req.body.merchantUid || `MO-${Date.now()}`;

  if (!amount || !depositorName) {
    return res
      .status(400)
      .json({ success: false, error: 'amount와 depositorName을 모두 전달해야 합니다.' });
  }

  try {
    // PayAction API는 snake_case 키를 요구합니다.
    const payload = {
      merchant_uid:   merchantUid,
      amount:         amount,
      depositor_name: depositorName
    };

    const apiRes = await fetch('https://api.payaction.app/order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key':     process.env.PAYACTION_API_KEY,
        'x-mall-id':     process.env.PAYACTION_MALL_ID
      },
      body: JSON.stringify(payload)
    });

    const data = await apiRes.json();

    if (data.status !== 'success') {
      console.error('[PayAction order error]', data);
      return res
        .status(400)
        .json({ success: false, error: data.response?.message || '주문 생성 실패', details: data });
    }

    // 성공: data.response 에 실제 주문 정보가 들어 있습니다.
    return res.json({ success: true, order: data.response });

  } catch (err) {
    console.error('createPayment error:', err);
    return res
      .status(500)
      .json({ success: false, error: '서버 내부 오류가 발생했습니다.' });
  }
});

module.exports = router;
