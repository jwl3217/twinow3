// 경로: src/components/Home.jsx
import React, { useEffect, useState } from 'react';
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
import { TERMS_MD }        from '../content/termsDraft.js'; // 약관 별도 파일(현재 네 파일 기준 유지)
import '../styles/Home.css';

export default function Home() {
  const navigate = useNavigate();

  // 체크/모달/모드
  const [agreeInfo, setAgreeInfo]   = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [openModal, setOpenModal]   = useState(null);  // 'about' | 'terms' | null
  const [isLoginMode, setIsLoginMode] = useState(false); // ← 로그인 모드 토글

  const canLogin = agreeInfo && agreeTerms;

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
    // 가입 모드일 때만 체크 강제, 로그인 모드는 무시하고 진행
    if (!isLoginMode && !canLogin) return;

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

          if (until && Date.now() < until) {
            if (!bannedUid || bannedUid === u.uid) {
              bannedUntil = until;
              break;
            }
          }
        }

        if (bannedUntil) {
          alert(`${fmt(bannedUntil)} 이후부터재가입이 가능합니다.`);
          await auth.signOut?.();
          return;
        }
      } catch (e) {
        // 조회 실패해도 신규/기존 분기 계속
      }

      const userRef = doc(db, 'users', u.uid);
      const snap    = await getDoc(userRef);

      // 신규 문서 생성 → 회원가입 페이지로 이동 + 안내 모달(회원가입 페이지에서 alert)
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
        sessionStorage.setItem('signupNotice', 'noProfile');
        return navigate('/signup');
      }

      // 기존 문서 존재
      const data = snap.data();
      if (data.nickname && data.gender && data.region) {
        // 완성된 계정 → 피드로 이동 + 안내 모달(피드에서 alert)
        sessionStorage.setItem('loginNotice', 'existingLogin');
        navigate('/feed');
      } else {
        // 프로필 미완성 → 회원가입 페이지로 이동 + 안내 모달(회원가입 페이지에서 alert)
        sessionStorage.setItem('signupNotice', 'noProfile');
        navigate('/signup');
      }
    } catch (err) {
      console.error('로그인 오류:', err);
      alert('로그인에 실패했습니다. 다시 시도해주세요.');
    }
  };

  // 소개 문구(모달용)
  const ABOUT_TEXT = `트위나우TwiNow는 트위터와 비슷한,
온라인에서 나의 지역을 기반으로 친구를 찾을 수 있는 플랫폼이에요.

기존 스팸 계정이나 도용 계정이 너무 많아 불편했던 트위터와 다르게,
트위나우TwiNow에서는 데이터 분석을 통해 스팸이나 도용 계정을 걸러내고
실제 사람과 빠르게 연결될 수 있어요.`;

  // 라벨/활성 상태 계산
  const googleLabel  = isLoginMode ? 'google로 로그인'  : 'google로 회원가입';
  const twitterLabel = isLoginMode ? 'twitter로 로그인' : 'twitter로 회원가입';
  const buttonsDisabled = isLoginMode ? false : !canLogin; // 로그인 모드면 항상 활성

  return (
    <div className="home-container">
      <img src={twinowLogo} alt="TwiNow 로고" className="logo" />
      <p style={{ textAlign: 'center', margin: '20px 0 5px', color: '#555' }}>
        트위나우는 트위터와 비슷한
      </p>
      <p style={{ textAlign: 'center', margin: '0 0 20px', color: '#555' }}>
        온라인 채팅 커뮤니티 플랫폼입니다.
      </p>

      {/* 로그인/회원가입 영역 */}
      <div
        className="login-area"
        style={{
          width: 'min(420px, 92%)',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 10
        }}
      >
        {/* 체크 두 줄: 로그인 모드일 때 회색 + 비활성화 */}
        <div
          style={{
            fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0,
            opacity: isLoginMode ? 0.45 : 1, pointerEvents: isLoginMode ? 'none' : 'auto'
          }}
        >
          <button
            type="button"
            onClick={() => setAgreeInfo(v => !v)}
            aria-pressed={agreeInfo}
            style={{
              border: 'none',
              background: 'none',
              padding: 0,
              fontSize: 18,
              cursor: 'pointer',
              lineHeight: 1
            }}
            title="확인했습니다"
          >
            {agreeInfo ? '✔️' : '❌'}
          </button>
          {' '}
          <button
            type="button"
            onClick={() => setOpenModal('about')}
            style={{
              border: 'none',
              background: 'none',
              padding: 0,
              margin: 0,
              textAlign: 'left',
              cursor: 'pointer',
              fontWeight: 700
            }}
          >
            트위나우TwiNow가 뭔가요?
          </button>
        </div>

        <div
          style={{
            fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0,
            opacity: isLoginMode ? 0.45 : 1, pointerEvents: isLoginMode ? 'none' : 'auto'
          }}
        >
          <button
            type="button"
            onClick={() => setAgreeTerms(v => !v)}
            aria-pressed={agreeTerms}
            style={{
              border: 'none',
              background: 'none',
              padding: 0,
              fontSize: 18,
              cursor: 'pointer',
              lineHeight: 1
            }}
            title="확인했습니다"
          >
            {agreeTerms ? '✔️' : '❌'}
          </button>
          {' '}
          <button
            type="button"
            onClick={() => setOpenModal('terms')}
            style={{
              border: 'none',
              background: 'none',
              padding: 0,
              margin: 0,
              textAlign: 'left',
              cursor: 'pointer',
              fontWeight: 700
            }}
          >
            회원약관 확인
          </button>
        </div>

        {/* 안내 문구: 가입 모드에서만 보여주고(로그인 모드에선 숨김), 공간도 차지 X */}
        {!isLoginMode && !canLogin && (
          <div
            style={{
              color: '#d93025',
              fontSize: 10,
              marginTop: 4,
              marginBottom: 6,
              textAlign: 'center'
            }}
          >
            (❌표시를 모두 클릭해주세요.)
          </div>
        )}

        {/* 버튼 2개 */}
        <button
          className="login-btn google"
          onClick={() => handleProviderLogin(new GoogleAuthProvider())}
          disabled={buttonsDisabled}
          style={{
            width: '100%',
            opacity: buttonsDisabled ? 0.5 : 1,
            cursor: buttonsDisabled ? 'not-allowed' : 'pointer'
          }}
        >
          {googleLabel}
        </button>

        <button
          className="login-btn twitter"
          onClick={() => handleProviderLogin(new TwitterAuthProvider())}
          disabled={buttonsDisabled}
          style={{
            width: '100%',
            opacity: buttonsDisabled ? 0.5 : 1,
            cursor: buttonsDisabled ? 'not-allowed' : 'pointer'
          }}
        >
          {twitterLabel}
        </button>

        {/* 하단 작은 링크: 모드 토글 */}
        <button
          type="button"
          onClick={() => setIsLoginMode(v => !v)}
          style={{
            marginTop: 6,
            background: 'none',
            border: 'none',
            fontSize: 12,
            textDecoration: 'underline',
            color: '#1a73e8',
            cursor: 'pointer',
            alignSelf: 'center'
          }}
        >
          {isLoginMode ? '계정이 없으신가요? 회원가입하기' : '이미 계정이 있으신가요? 로그인하기'}
        </button>
      </div>

      {/* 커스텀 카드 모달 */}
      {openModal && (
        <>
          <div
            onClick={() => setOpenModal(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.35)',
              zIndex: 1000
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 'min(720px, 92vw)',
              maxWidth: '720px',
              background: '#fff',
              borderRadius: 12,
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
              zIndex: 1001,
              display: 'flex',
              flexDirection: 'column',
              padding: '16px 16px 12px'
            }}
          >
            <button
              aria-label="닫기"
              onClick={() => setOpenModal(null)}
              style={{
                position: 'absolute',
                top: 10,
                right: 12,
                border: 'none',
                background: 'none',
                fontSize: 18,
                cursor: 'pointer'
              }}
            >
              ×
            </button>

            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 10 }}>
              {openModal === 'about' ? '트위나우TwiNow 안내' : '회원약관 안내'}
            </div>

            <div
              style={{
                border: '1px solid #eee',
                borderRadius: 8,
                padding: 12,
                height: '60vh',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.5,
                color: '#333'
              }}
            >
              {openModal === 'about' ? ABOUT_TEXT : TERMS_MD}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
