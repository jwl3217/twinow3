// src/components/AdminCreateUser.jsx


import React, { useState } from 'react';
import { useNavigate }     from 'react-router-dom';
import { auth }            from '../firebaseConfig';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db }              from '../firebaseConfig';
import { setDoc, doc, serverTimestamp } from 'firebase/firestore';
import defaultProfile      from '../assets/default-profile.png';
import '../styles/SignUp.css';

export default function AdminCreateUser() {
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [gender, setGender]     = useState('');
  const [age, setAge]           = useState('');
  const [region, setRegion]     = useState('');

  const handleSubmit = async () => {
    if (!email || !password || !nickname || !gender || !age || !region) {
      alert('모든 항목을 입력해 주세요.');
      return;
    }
    try {
      // 1) 이메일/비밀번호로 Auth 계정 생성
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const u = userCred.user;

      // 2) Firestore에 사용자 문서 생성 (authProvider 기록 추가)
      await setDoc(doc(db, 'users', u.uid), {
        uid:           u.uid,
        displayName:   u.displayName || '',
        photoURL:      defaultProfile,
        nickname,
        gender,
        age:           Number(age),
        region,
        coins:         200,
        authProvider:  'password',              // 이메일/비번 가입임을 명시
        createdAt:     serverTimestamp()
      });

      alert('계정이 생성되었습니다.');
      navigate('/admin');
    } catch (err) {
      alert('생성 중 오류: ' + err.message);
    }
  };

  return (
    <div className="signup-container">
      <h2>계정 생성 (관리자용)</h2>
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
      <div className="field">
        <label>닉네임:</label>
        <input value={nickname} onChange={e => setNickname(e.target.value)} />
      </div>
      <div className="field">
        <label>성별:</label>
        <select value={gender} onChange={e => setGender(e.target.value)}>
          <option value="">선택</option>
          <option value="male">남자</option>
          <option value="female">여자</option>
        </select>
      </div>
      <div className="field">
        <label>나이:</label>
        <select value={age} onChange={e => setAge(e.target.value)}>
          <option value="">선택</option>
          {Array.from({ length: 62 }, (_, i) => 19 + i).map(n => (
            <option key={n} value={n}>{n}세</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>지역:</label>
        <select value={region} onChange={e => setRegion(e.target.value)}>
          <option value="">선택</option>
          {['서울','부산','대구','인천','광주','대전','울산','세종','경기도','강원도','충북','충남','전북','전남','경북','경남','제주']
            .map(loc => <option key={loc} value={loc}>{loc}</option>)}
        </select>
      </div>

      <button className="confirm-button" onClick={handleSubmit}>
        생성하기
      </button>
    </div>
  );
}
