// src/components/PaymentResult.jsx
import React from 'react';

export default function PaymentResult() {
  return (
    <div>
      <h2>결제가 완료되었습니다!</h2>
      <button onClick={() => window.location.replace('/')}>홈으로</button>
    </div>
  );
}
