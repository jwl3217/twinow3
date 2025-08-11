// 경로: src/components/Withdraw.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate }       from 'react-router-dom';
import { auth, db }          from '../firebaseConfig';
import { deleteUser }        from 'firebase/auth';
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  getDoc,
  setDoc            // ★ 추가
} from 'firebase/firestore';
import '../styles/Withdraw.css';
import backArrow from '../assets/back-arrow.png';

export default function Withdraw() {
  const [agree, setAgree]       = useState(false);
  const [coins, setCoins]       = useState(0);
  const [nickname, setNickname] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const u = auth.currentUser;
    if (!u) return;
    (async () => {
      try {
        const userRef = doc(db, 'users', u.uid);
        const snap    = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          setCoins(data.coins || 0);
          setNickname(data.nickname || u.displayName || '알 수 없음');
        }
      } catch (err) {
        console.error('코인 수 로드 실패:', err);
      }
    })();
  }, []);

  const handleWithdraw = async () => {
    try {
      // ★ 3일 재가입 불가 안내 모달(브라우저 기본)
      const ok = window.confirm('회원탈퇴 후 3일 동안 재가입이 불가합니다. 회원탈퇴하시겠습니까?');
      if (!ok) return;

      const user = auth.currentUser;
      if (!user) throw new Error('로그인이 필요합니다.');

      // ★ 재가입 제한 레코드 기록
      try {
        const userRef  = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        const uData    = userSnap.data() || {};
        const email    = (uData.email || user.email || '').trim().toLowerCase() || null;
        const p0       = user.providerData?.[0] || {};
        const sub      = `${p0.providerId || 'unknown'}:${p0.uid || user.uid}`;
        const untilAt  = Date.now() + 3 * 24 * 60 * 60 * 1000; // 3일(ms)

        const key = email ? `email:${email}` : `sub:${sub}`;
        await setDoc(doc(db, 'rejoinBans', key), {
          email: email,
          sub,
          untilAt
        }, { merge: true });
      } catch (e) {
        // 기록 실패해도 탈퇴 자체는 계속
        console.warn('rejoinBans 기록 실패:', e);
      }

      // 게시글 삭제
      const postsQ    = query(collection(db, 'posts'), where('uid', '==', user.uid));
      const postSnaps = await getDocs(postsQ);
      await Promise.all(postSnaps.docs.map(snap => deleteDoc(doc(db, 'posts', snap.id))));

      // 유저 문서 삭제
      await deleteDoc(doc(db, 'users', user.uid));

      // Auth 계정 즉시 삭제(기존과 동일)
      await deleteUser(user);

      navigate('/', { replace: true });
    } catch (error) {
      console.error('회원탈퇴 중 오류:', error);
      if (error.code === 'auth/requires-recent-login') {
        alert('보안을 위해 최근에 다시 로그인 후 시도해 주세요.');
        await auth.signOut?.();
        navigate('/', { replace: true });
      } else {
        alert('회원탈퇴 중 오류가 발생했습니다.');
      }
    }
  };

  return (
    <div className="withdraw-container">
      <button className="back-button" onClick={() => navigate(-1)}>
        <img src={backArrow} alt="뒤로가기" className="back-btn-icon" />
      </button>
      <span className="header-title">회원탈퇴</span>

      <div className="withdraw-box">
        <p className="withdraw-text">
          회원탈퇴 시 <strong>{nickname}</strong>님의 코인{' '}
          <span className="highlight">{coins}개</span>가 사라지며,
          <br />
          그동안 작성한 글은 자동으로 삭제됩니다.
          <br />
          삭제된 계정은 복구할 수 없습니다.
        </p>

        <label className="withdraw-checkbox">
          <input
            type="checkbox"
            checked={agree}
            onChange={() => setAgree(prev => !prev)}
          />
          네, 알겠습니다
        </label>

        <button
          className="withdraw-btn"
          disabled={!agree}
          onClick={handleWithdraw}
        >
          회원탈퇴
        </button>
      </div>
    </div>
  );
}
