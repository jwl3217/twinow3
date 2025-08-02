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
  getDoc
} from 'firebase/firestore';
import '../styles/Withdraw.css';
import backArrow from '../assets/back-arrow.png';

export default function Withdraw() {
  const [agree, setAgree]       = useState(false);
  const [coins, setCoins]       = useState(0);
  const [nickname, setNickname] = useState(''); // ← 추가
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
      const user = auth.currentUser;
      if (!user) throw new Error('로그인이 필요합니다.');

      const postsQ    = query(
        collection(db, 'posts'),
        where('uid', '==', user.uid)
      );
      const postSnaps = await getDocs(postsQ);
      await Promise.all(
        postSnaps.docs.map(snap =>
          deleteDoc(doc(db, 'posts', snap.id))
        )
      );

      await deleteDoc(doc(db, 'users', user.uid));
      await deleteUser(user);
      navigate('/', { replace: true });
    } catch (error) {
      console.error('회원탈퇴 중 오류:', error);
      if (error.code === 'auth/requires-recent-login') {
        alert('보안을 위해 최근에 다시 로그인 후 시도해 주세요.');
        await auth.signOut();
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
