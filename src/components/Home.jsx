// 경로: src/components/Home.jsx
import React, { useEffect } from 'react';
import { useNavigate }      from 'react-router-dom';
import {
  GoogleAuthProvider,
  TwitterAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db }        from '../firebaseConfig';
import twinowLogo          from '../assets/twinow-logo.png';
import '../styles/Home.css';

export default function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    const nav = document.querySelector('.bottom-nav');
    if (nav) nav.style.display = 'none';
    return () => { if (nav) nav.style.display = ''; };
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) return;
      try {
        const snap = await getDoc(doc(db, 'users', u.uid));
        if (!snap.exists()) {
          navigate('/signup', { replace: true });
          return;
        }
        const data = snap.data();
        if (data.nickname && data.gender && data.region) {
          navigate('/feed', { replace: true });
        } else {
          navigate('/signup', { replace: true });
        }
      } catch {}
    });
    return () => unsub();
  }, [navigate]);

  // 보조: 날짜 포맷
  const pad2 = n => String(n).padStart(2, '0');
  const fmt = (ms) => {
    const d = new Date(ms);
    return `${d.getFullYear()}.${pad2(d.getMonth()+1)}.${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  };

  const handleProviderLogin = async provider => {
    try {
      const result  = await signInWithPopup(auth, provider);
      const u       = result.user;

      // ★ 재가입 제한 확인 (email 우선, 없으면 provider-sub)
      try {
        const email = (u.email || '').trim().toLowerCase();
        const p0    = u.providerData?.[0] || {};
        const sub   = `${p0.providerId || 'unknown'}:${p0.uid || u.uid}`;

        const keys = [];
        if (email) keys.push(`email:${email}`);
        keys.push(`sub:${sub}`);

        let bannedUntil = null;

        for (const k of keys) {
          const bSnap = await getDoc(doc(db, 'rejoinBans', k));
          if (!bSnap.exists()) continue;

          const d = bSnap.data();
          const until = d?.untilAt;
          const bannedUid = d?.bannedUid;

          // 1) 기한이 남아있고
          // 2) bannedUid가 설정되어 있으며 현재 로그인 uid와 "같은" 경우에만 제한 적용
          //    (관리자가 기존 Auth 계정을 삭제해서 새 uid가 발급된 경우 → 허용)
          if (until && Date.now() < until) {
            if (!bannedUid || bannedUid === u.uid) {
              bannedUntil = until;
              break;
            }
          }
        }

        if (bannedUntil) {
          alert(`${fmt(bannedUntil)} 이후부터 재가입이 가능합니다.`);
          await auth.signOut?.();
          return; // 여기서 흐름 종료
        }
      } catch (e) {
        // 조회 실패해도 신규/기존 분기 계속
      }

      const userRef = doc(db, 'users', u.uid);
      const snap    = await getDoc(userRef);

      if (!snap.exists()) {
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
