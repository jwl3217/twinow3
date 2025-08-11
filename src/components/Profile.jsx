// src/components/Profile.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate }               from 'react-router-dom';
import { auth, db }                  from '../firebaseConfig';
import { doc, getDoc }               from 'firebase/firestore';
import { onAuthStateChanged }        from 'firebase/auth';
import defaultProfile                from '../assets/default-profile.png';
import backArrow                     from '../assets/back-arrow.png';
import ImageModal                    from './ImageModal';
import '../styles/Profile.css';

export default function Profile() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [modalSrc, setModalSrc] = useState(null);
  const [isAdmin, setIsAdmin]   = useState(false);

  // Auth 상태 감시 및 사용자 정보 로드
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async u => {
      if (!u) {
        navigate('/', { replace: true });
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'users', u.uid));
        if (!snap.exists()) {
          navigate('/signup', { replace: true });
          return;
        }
        setUserData(snap.data());
      } catch (e) {
        console.error('유저 데이터 로드 오류:', e);
      }
    });
    return () => unsubAuth();
  }, [navigate]);

  // 관리자 여부 확인
  useEffect(() => {
    auth.currentUser
      ?.getIdTokenResult()
      .then(({ claims }) => setIsAdmin(!!claims.admin))
      .catch(console.error);
  }, []);

  const doLogout = () => {
    localStorage.removeItem('impersonatorUid');
    auth.signOut().then(() => navigate('/', { replace: true }));
  };

  // ✅ 브라우저 기본 confirm 사용
  const handleLogoutClick = () => {
    if (window.confirm('정말 로그아웃하시겠습니까?')) {
      doLogout();
    }
  };

  if (!userData) return null;

  return (
    <div className="profile-container">
      <header className="profile-header">
        <button
          type="button"
          className="back-button"
          onClick={() => navigate(-1)}
        >
          <img src={backArrow} alt="뒤로가기" className="back-btn-icon" />
        </button>
        <span className="header-title">마이페이지</span>
      </header>

      <div className="profile-separator" />

      <div className="profile-body">
        <img
          src={userData.photoURL || defaultProfile}
          alt="프로필"
          className="profile-pic"
          onClick={() => setModalSrc(userData.photoURL || defaultProfile)}
        />

        <div className="profile-info">
          <p>닉네임: {userData.nickname}</p>
          <p>성별: {userData.gender === 'male' ? '남자' : '여자'}</p>
          <p>나이: {userData.age}세</p>
          <p>지역: {userData.region}</p>
        </div>

        <p className="coin-info">
          {userData.nickname}님의 코인은 {userData.coins}개입니다
        </p>

        {/* ✅ 관리자 전용 버튼 */}
        {isAdmin && (
          <button
            type="button"
            className="btn"
            onClick={() => navigate('/admin/switch')}
          >
            대시보드로 이동
          </button>
        )}

        <button
          type="button"
          className="btn"
          onClick={() => navigate('/shop')}
        >
          코인 구매하기
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => navigate('/profile/edit')}
        >
          프로필 수정
        </button>
        <button
          type="button"
          className="btn"
          onClick={handleLogoutClick}
        >
          로그아웃
        </button>
        {!isAdmin && (
          <button
            type="button"
            className="text-link withdraw-text"
            onClick={() => navigate('/withdraw')}
          >
            회원탈퇴
          </button>
        )}
      </div>

      {modalSrc && (
        <ImageModal
          src={modalSrc}
          onClose={() => setModalSrc(null)}
        />
      )}
    </div>
  );
}
