// src/components/ManualPayment.jsx
import React, { useState } from 'react';

export default function ManualPayment() {
  const [name, setName]     = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name || !amount) {
      return alert('이름과 금액을 입력해주세요.');
    }
    setLoading(true);
    const merchantUid = `order_${Date.now()}`;

    try {
      const res = await fetch('/api/createPayment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
       merchantUid,
       amount: Number(amount),
       depositorName: name
     })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '주문 생성 실패');
      alert(`주문 생성 성공!\n주문ID: ${merchantUid}`);
      setName('');
      setAmount('');
    } catch (err) {
      console.error(err);
      alert(`주문 생성 중 오류가 발생했습니다.\n${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: 'auto' }}>
      <h2>무통장입금 주문 생성</h2>
      <input
        placeholder="입금자명"
        value={name}
        onChange={e => setName(e.target.value)}
        style={{ width: '100%', marginBottom: 8 }}
      />
      <input
        placeholder="금액"
        type="number"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        style={{ width: '100%', marginBottom: 8 }}
      />
      <button onClick={handleCreate} disabled={loading} style={{ width: '100%' }}>
        {loading ? '생성 중…' : '주문 생성'}
      </button>
    </div>
  );
}
