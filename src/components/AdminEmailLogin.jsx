// src/components/AdminEmailLogin.jsx
import React, { useState } from 'react';
import { useNavigate }      from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth }            from '../firebaseConfig';
import '../styles/SignUp.css'; // 스타일 재사용

export default function AdminEmailLogin() {
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/admin', { replace: true });
    } catch (e) {
      setError('로그인 실패: ' + e.message);
    }
  };

  return (
    <div className="signup-container">
      <h2>관리자 이메일 로그인</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <div className="field">
        <label>이메일:</label>
        <input value={email} onChange={e => setEmail(e.target.value)} />
      </div>
      <div className="field">
        <label>비밀번호:</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
      </div>
      <button className="confirm-button" onClick={handleLogin}>
        로그인
      </button>
    </div>
  );
}
