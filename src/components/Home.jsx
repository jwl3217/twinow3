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
import { TERMS_MD }        from '../content/termsDraft.js'; // ✅ 약관 별도 파일
import '../styles/Home.css';

export default function Home() {
  const navigate = useNavigate();

  // ✅ 추가: 체크/모달 상태
  const [agreeInfo, setAgreeInfo]   = useState(false); // "트위나우TwiNow가 뭔가요?" 확인 체크
  const [agreeTerms, setAgreeTerms] = useState(false); // 회원약관 확인 체크
  const [openModal, setOpenModal]   = useState(null);  // 'about' | 'terms' | null

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
    if (!canLogin) return; // 안전장치
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

  // ✅ 소개 문구(모달용) - 줄바꿈 유지
  const ABOUT_TEXT = `트위나우TwiNow는 트위터와 비슷한,
온라인에서 나의 지역을 기반으로 친구를 찾을 수 있는 플랫폼이에요.

기존 스팸 계정이나 도용 계정이 너무 많아 불편했던 트위터와 다르게,
트위나우TwiNow에서는 데이터 분석을 통해 스팸이나 도용 계정을 걸러내고
실제 사람과 빠르게 연결될 수 있어요.`;

  return (
    <div className="home-container">
      <img src={twinowLogo} alt="TwiNow 로고" className="logo" />
      <p style={{ textAlign: 'center', margin: '20px 0 5px', color: '#555' }}>
        트위나우는 트위터와 비슷한
      </p>
      <p style={{ textAlign: 'center', margin: '0 0 20px', color: '#555' }}>
        온라인 채팅 커뮤니티 플랫폼입니다.
      </p>

      {/* ✅ 로그인 영역 래퍼 */}
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
        {/* ✅ 두 줄(❌/✔️ + 텍스트) - 스페이스 한 칸 복원 */}
        <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0 }}>
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
          {' '}{/* ← 스페이스 한 칸 */}
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

        <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0 }}>
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
          {' '}{/* ← 스페이스 한 칸 */}
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

        {/* ✅ 안내 문구: 두 체크가 모두 ✔️가 되면 사라지고 공간을 차지하지 않음 */}
        {!canLogin && (
          <div
            style={{
              color: '#d93025',
              fontSize: 10,
              marginTop: 4,
              marginBottom: 6,
              textAlign: 'center'
            }}
          >
            X를 모두 클릭해주세요.
          </div>
        )}

        {/* ✅ 로그인 버튼들(회색 비활성 → 체크 2개 모두 ✔️ 시 활성) */}
        <button
          className="login-btn google"
          onClick={() => handleProviderLogin(new GoogleAuthProvider())}
          disabled={!canLogin}
          style={{
            width: '100%',
            opacity: canLogin ? 1 : 0.5,
            cursor: canLogin ? 'pointer' : 'not-allowed'
          }}
        >
          Google로 로그인
        </button>
        <button
          className="login-btn twitter"
          onClick={() => handleProviderLogin(new TwitterAuthProvider())}
          disabled={!canLogin}
          style={{
            width: '100%',
            opacity: canLogin ? 1 : 0.5,
            cursor: canLogin ? 'pointer' : 'not-allowed'
          }}
        >
          Twitter로 로그인
        </button>
      </div>

      {/* ✅ 커스텀 카드 모달 (웹 기본 모달 X) */}
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
            {/* 닫기 X */}
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

            {/* 본문: 고정 높이 + 내부 스크롤 (모달 크기 고정) */}
            <div
              style={{
                border: '1px solid #eee',
                borderRadius: 8,
                padding: 12,
                height: '60vh',          // ← 고정 높이
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
