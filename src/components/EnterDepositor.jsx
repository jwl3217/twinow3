import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/EnterDepositor.css';

export default function EnterDepositor() {
  const { amount } = useParams();
  const navigate  = useNavigate();
  const [depositorName, setDepositorName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!depositorName.trim()) {
      alert('입금자명을 입력해주세요.');
      return;
    }
    // URL 파라미터로 입금자명 전달
    navigate(`/payment/${amount}/${encodeURIComponent(depositorName)}`);
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
          value={depositorName}
          onChange={(e) => setDepositorName(e.target.value)}
          placeholder="예: 홍길동"
        />
        <button type="submit">다음</button>
      </form>
    </div>
  );
}
