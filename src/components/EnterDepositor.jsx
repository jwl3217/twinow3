import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/EnterDepositor.css';

export default function EnterDepositor() {
  const { amount } = useParams();       // Shop에서 전달된 코인 수량
  const navigate  = useNavigate();
  const [depositorName, setDepositorName] = useState('');

  const handleSubmit = e => {
    e.preventDefault();
    if (!depositorName.trim()) {
      return alert('입금자명을 입력해주세요.');
    }
    // 결제 페이지로 입금자명과 amount 전송
    navigate(`/payment/${amount}`, { state: { depositorName } });
  };

  return (
    <div className="enter-depositor-container">
      <h2>입금자명 입력</h2>
      <form onSubmit={handleSubmit}>
        <label>
          입금자명
          <input
            type="text"
            value={depositorName}
            onChange={e => setDepositorName(e.target.value)}
            placeholder="예: 홍길동"
          />
        </label>
        <button type="submit">다음</button>
      </form>
    </div>
  );
}
