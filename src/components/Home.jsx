// 경로: src/components/Home.jsx

import React, { useEffect } from 'react';
import { useNavigate }      from 'react-router-dom';
import {
  GoogleAuthProvider,
  TwitterAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db }        from '../firebaseConfig';
import twinowLogo          from '../assets/twinow-logo.png';
import '../styles/Home.css';

export default function Home() {
  const navigate = useNavigate();

  // BottomNav 숨기기
  useEffect(() => {
    const nav = document.querySelector('.bottom-nav');
    if (nav) nav.style.display = 'none';
    return () => { if (nav) nav.style.display = ''; };
  }, []);

  const handleProviderLogin = async provider => {
    try {
      const result = await signInWithPopup(auth, provider);
      const u      = result.user;
      const userRef = doc(db, 'users', u.uid);
      const snap   = await getDoc(userRef);

      if (!snap.exists()) {
        // 신규 가입자: Firestore 에 프로필 문서 생성 (authProvider 기록)
        await setDoc(userRef, {
          uid:           u.uid,
          displayName:   u.displayName || '',
          photoURL:      u.photoURL || null,
          nickname:      '',
          gender:        '',
          age:           null,
          region:        '',
          coins:         200,
          email:         u.email,
          authProvider:  result.providerId,  // e.g. 'google.com' or 'twitter.com'
          createdAt:     serverTimestamp()
        });
        return navigate('/signup');
      }

      // 기존 가입자: 프로필 완성 여부로 분기
      const data = snap.data();
      if (data.nickname && data.gender && data.region) {
        navigate('/feed');
      } else {
        navigate('/signup');
      }
    } catch (err) {
      console.error('로그인 오류:', err);
      alert('로그인에 실패했습니다. 다시 시도해주세요.');
    }
  };

  return (
    <div className="home-container">
      <img src={twinowLogo} alt="TwiNow 로고" className="logo" />
      <h1>TwiNow</h1>
      <p style={{ textAlign: 'center', margin: '20px 0 5px', color: '#555' }}>
        트위나우는 트위터와 비슷한
      </p>
      <p style={{ textAlign: 'center', margin: '0 0 20px', color: '#555' }}>
        온라인 채팅 커뮤니티 플랫폼입니다.
      </p>

      <button
        className="login-btn google"
        onClick={() => handleProviderLogin(new GoogleAuthProvider())}
      >
        Google로 로그인
      </button>
      <button
        className="login-btn twitter"
        onClick={() => handleProviderLogin(new TwitterAuthProvider())}
      >
        Twitter로 로그인
      </button>
    </div>
  );
}
