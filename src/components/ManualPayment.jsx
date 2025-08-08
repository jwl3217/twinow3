// ManualPayment.jsx
import React, { useState } from 'react';

export default function ManualPayment() {
  const [amount, setAmount] = useState('');
  const [depositorName, setDepositorName] = useState('');

  const onClick = async () => {
    // 1) 필수값 검증
    if (!amount || !depositorName) {
      alert('금액과 입금자명을 모두 입력해주세요.');
      return;
    }

    // 2) merchantUid 생성 (유니크 ID)
    const merchantUid = `order_${Date.now()}`;

    try {
      const res = await fetch('/api/createPayment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchantUid, amount, depositorName })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '주문 생성에 실패했습니다.');
      }

      console.log('주문 생성 성공:', data);
      // TODO: 성공 시 처리 (예: 결제화면 오픈 등)
    } catch (err) {
      console.error('결제 주문 생성 실패:', err);
      alert(`결제 실패: ${err.message}`);
    }
  };

  return (
    <div>
      <div>
        <label>금액</label>
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="금액을 입력하세요"
        />
      </div>
      <div>
        <label>입금자명</label>
        <input
          type="text"
          value={depositorName}
          onChange={e => setDepositorName(e.target.value)}
          placeholder="입금자명을 입력하세요"
        />
      </div>
      <button onClick={onClick}>결제 주문 생성</button>
    </div>
  );
}
