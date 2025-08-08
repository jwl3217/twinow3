import React from 'react';

export default function ManualPayment() {
  const handleCreateOrder = async () => {
    const merchantUid = `order_${Date.now()}`;
    const amount      = 1000; // 예시
    const res = await fetch('/api/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchantUid, amount })
    });
    const body = await res.json();
    if (!res.ok) {
      return alert('결제 주문 생성 실패: ' + (body.error || res.status));
    }
    // 대시보드 '매칭대기' 탭으로 바로 이동
    const url = `https://dashboard.payaction.app/mall/${process.env.REACT_APP_PAYACTION_MALL_ID}/payments?status=PENDING`;
    window.open(url, '_blank');
  };

  return (
    <button onClick={handleCreateOrder}>
      무통장 입금 주문 생성 &amp; 대시보드 열기
    </button>
  );
}
