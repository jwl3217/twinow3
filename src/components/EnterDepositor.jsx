import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import '../styles/EnterDepositor.css';

export default function EnterDepositor() {
  const { amount } = useParams();
  const navigate   = useNavigate();
  const [depositor, setDepositor] = useState('');

  const handleSubmit = e => {
    e.preventDefault();
    if (!depositor.trim()) return;
    // 결제 페이지로 이동하며 입금자명은 쿼리스트링으로 전달
    navigate(`/payment/${amount}?depositor=${encodeURIComponent(depositor.trim())}`);
  };

  return (
    <div className="enter-depositor-container">
      <header className="detail-header">
        <h2>입금자명 입력</h2>
      </header>
      <div className="detail-separator" />
      <form className="depositor-form" onSubmit={handleSubmit}>
        <label htmlFor="depositorName">입금자명</label>
        <input
          id="depositorName"
          type="text"
          value={depositor}
          onChange={e => setDepositor(e.target.value)}
          placeholder="예금주명을 입력해주세요"
        />
        <button type="submit">결제하기</button>
      </form>
    </div>
  );
}
