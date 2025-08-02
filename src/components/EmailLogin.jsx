// src/components/EmailLogin.jsx

import React, { useState } from 'react';
import { useNavigate }      from 'react-router-dom';
import { auth }             from '../firebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';
import '../styles/EmailLogin.css';

export default function EmailLogin() {
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState(null);

  const handleSubmit = async e => {
    e.preventDefault();
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // 로그인 성공하면 피드로 이동
      navigate('/feed', { replace: true });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="email-login-container">
      <h2>이메일 로그인</h2>
      <form className="email-login-form" onSubmit={handleSubmit}>
        <label>
          이메일
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          비밀번호
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <p className="error-text">{error}</p>}
        <button type="submit" className="login-btn">
          로그인
        </button>
      </form>
    </div>
  );
}
