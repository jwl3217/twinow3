// 경로: src/components/EnterDepositor.jsx

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/EnterDepositor.css';

export default function EnterDepositor() {
  const { amount } = useParams();
  const navigate = useNavigate();
  const [depositor, setDepositor] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!depositor.trim()) {
      alert('입금자명을 입력해주세요');
      return;
    }
    // URL 인코딩
    const name = encodeURIComponent(depositor.trim());
    navigate(`/payment/${amount}/${name}`);
  };

  return (
    <div className="enter-depositor-container">
      <header className="enter-depositor-header">
        <h2>입금자명 입력</h2>
      </header>
      <div className="enter-depositor-separator" />
      <form className="enter-depositor-form" onSubmit={handleSubmit}>
        <label htmlFor="depositor">입금자명</label>
        <input
          id="depositor"
          type="text"
          value={depositor}
          onChange={(e) => setDepositor(e.target.value)}
          placeholder="입금자명을 입력하세요"
        />
        <button type="submit">확인</button>
      </form>
    </div>
  );
}
