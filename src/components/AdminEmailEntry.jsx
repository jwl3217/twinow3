// src/components/AdminEmailEntry.jsx

import React, { useState } from 'react';
import { useNavigate }     from 'react-router-dom';
import '../styles/SignUp.css'; // 기존 SignUp 스타일 재사용

export default function AdminEmailEntry() {
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = () => {
    if (!email.trim() || !password.trim()) {
      alert('이메일과 비밀번호를 모두 입력해 주세요.');
      return;
    }
    // SignUp 컴포넌트로 email/password 전달
    navigate('/signup', { state: { email, password } });
  };

  return (
    <div className="signup-container">
      <h2>계정 생성 (이메일/비밀번호)</h2>

      <div className="field">
        <label>이메일 :</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
      </div>

      <div className="field">
        <label>비밀번호 :</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
      </div>

      <button
        className="confirm-button"
        onClick={handleSubmit}
      >
        확인
      </button>
    </div>
  );
}
