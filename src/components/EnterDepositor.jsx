// src/components/EnterDepositor.jsx

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/EnterDepositor.css';

export default function EnterDepositor() {
  const { amount } = useParams();
  const navigate  = useNavigate();
  const [depositor, setDepositor] = useState('');

  const handleSubmit = e => {
    e.preventDefault();
    if (!depositor.trim()) return alert('입금자명을 입력해주세요.');
    // 결제 페이지로 이동 (amount, depositorName)
    navigate(`/payment/${amount}/${encodeURIComponent(depositor)}`);
  };

  return (
    <div className="enter-depositor-container">
      <h2>무통장 입금</h2>
      <p>코인 {Number(amount).toLocaleString()}개 구매를 위해</p>
      <form onSubmit={handleSubmit}>
        <label>
          입금자명
          <input
            type="text"
            value={depositor}
            onChange={e => setDepositor(e.target.value)}
            placeholder="예금주명을 입력하세요"
          />
        </label>
        <button type="submit">확인</button>
      </form>
    </div>
  );
}
