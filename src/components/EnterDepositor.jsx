import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/EnterDepositor.css';

export default function EnterDepositor() {
  const { amount } = useParams();       // URL: /enter-depositor/:amount
  const navigate  = useNavigate();
  const [depositor, setDepositor] = useState('');

  const handleSubmit = e => {
    e.preventDefault();
    if (!depositor.trim()) {
      alert('예금주명을 입력해주세요');
      return;
    }
    // 인코딩하여 URL에 넣어줍니다
    navigate(`/payment/${amount}/${encodeURIComponent(depositor.trim())}`);
  };

  return (
    <div className="enter-depositor">
      <h2>입금자명 입력</h2>
      <form onSubmit={handleSubmit}>
        <label>
          입금자명
          <input
            type="text"
            value={depositor}
            onChange={e => setDepositor(e.target.value)}
            placeholder="예: 홍길동"
          />
        </label>
        <button type="submit">확인</button>
      </form>
    </div>
  );
}
