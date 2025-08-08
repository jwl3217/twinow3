// src/components/ManualPayment.jsx
import React, { useState } from 'react';

export default function ManualPayment() {
  const [depositorName, setDepositorName] = useState('');
  const [amount, setAmount]             = useState('');
  const [buyerPhone, setBuyerPhone]     = useState('');   // ← 추가
  const [buyerEmail, setBuyerEmail]     = useState('');   // ← 추가

  const onSubmit = async (e) => {
    e.preventDefault();

    // 필수값 체크
    if (!depositorName || !amount || !buyerPhone || !buyerEmail) {
      return alert('입금자명, 금액, 휴대폰번호, 이메일을 모두 입력해주세요.');
    }

    try {
      const resp = await fetch(
        'https://api-ujypgdcuxa-uc.a.run.app/api/createPayment',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            merchantUid:    `MO-${Date.now()}`,
            amount:         Number(amount),
            depositorName,
            buyerPhone,            // ← 추가
            buyerEmail,            // ← 추가
            // 필요하다면 cashbillType, cashbillIdentifier 도 넣으세요
          }),
        }
      );

      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || '주문 생성 실패');
      console.log('주문 생성 성공:', result);
      alert('주문이 정상 생성되었습니다.');
    } catch (err) {
      console.error('결제 주문 생성 에러:', err);
      alert(err.message);
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <div>
        <label>입금자명</label>
        <input
          value={depositorName}
          onChange={e => setDepositorName(e.target.value)}
          required
        />
      </div>
      <div>
        <label>금액</label>
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          required
        />
      </div>
      <div>
        <label>휴대폰번호</label>
        <input
          type="tel"
          value={buyerPhone}
          onChange={e => setBuyerPhone(e.target.value)}
          required
        />
      </div>
      <div>
        <label>이메일</label>
        <input
          type="email"
          value={buyerEmail}
          onChange={e => setBuyerEmail(e.target.value)}
          required
        />
      </div>
      <button type="submit">주문 생성</button>
    </form>
  );
}
