// 경로: src/components/Home.jsx
import React, { useEffect } from 'react';
import { useNavigate }      from 'react-router-dom';
import {
  GoogleAuthProvider,
  TwitterAuthProvider,
  signInWithPopup,
  onAuthStateChanged,               // ★ 추가
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

  // ★ 이미 로그인된 경우 자동 리다이렉트
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) return;
      try {
        const snap = await getDoc(doc(db, 'users', u.uid));
        if (!snap.exists()) {
          // 유저 문서가 없으면 가입완료로
          navigate('/signup', { replace: true });
          return;
        }
        const data = snap.data();
        // 프로필 완성 여부에 따라 분기
        if (data.nickname && data.gender && data.region) {
          navigate('/feed', { replace: true });
        } else {
          navigate('/signup', { replace: true });
        }
      } catch {
        // 문제 생겨도 홈에 머무르도록 조용히 무시
      }
    });
    return () => unsub();
  }, [navigate]);

  const handleProviderLogin = async provider => {
    try {
      const result  = await signInWithPopup(auth, provider);
      const u       = result.user;
      const userRef = doc(db, 'users', u.uid);
      const snap    = await getDoc(userRef);

      if (!snap.exists()) {
        // 신규 가입자 기본 문서 생성
        await setDoc(userRef, {
          uid:          u.uid,
          displayName:  u.displayName || '',
          photoURL:     u.photoURL || null,
          nickname:     '',
          gender:       '',
          age:          null,
          region:       '',
          coins:        200,
          email:        u.email,
          authProvider: result.providerId,  // 'google.com' | 'twitter.com'
          createdAt:    serverTimestamp()
        });
        return navigate('/signup');
      }

      // 기존 가입자 분기
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
