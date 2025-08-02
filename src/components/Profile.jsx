// src/components/Profile.jsx

import React, { useState, useEffect }  from 'react';
import { useNavigate }                 from 'react-router-dom';
import { auth, db, functions }         from '../firebaseConfig';
import { doc, getDoc }                 from 'firebase/firestore';
import { httpsCallable }                from 'firebase/functions';
import { signInWithCustomToken }        from 'firebase/auth';
import defaultProfile                   from '../assets/default-profile.png';
import backArrow                        from '../assets/back-arrow.png';
import ImageModal                       from './ImageModal';
import '../styles/Profile.css';

export default function Profile() {
  const navigate = useNavigate();
  const [userData, setUserData]               = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [modalSrc, setModalSrc]               = useState(null);
  const [isAdmin, setIsAdmin]                 = useState(false);

  // 1) 사용자 정보 로드
  useEffect(() => {
    const u = auth.currentUser;
    if (!u) return navigate('/', { replace: true });

    (async () => {
      const snap = await getDoc(doc(db, 'users', u.uid));
      if (!snap.exists()) return navigate('/signup', { replace: true });
      setUserData(snap.data());
    })();
  }, [navigate]);

  // 2) 관리자 여부 확인
  useEffect(() => {
    auth.currentUser
      ?.getIdTokenResult()
      .then(({ claims }) => setIsAdmin(!!claims.admin));
  }, []);

  // 로그아웃 (전환 이력 초기화)
  const doLogout = () => {
    localStorage.removeItem('impersonatorUid');
    auth.signOut().then(() => navigate('/', { replace: true }));
  };

  // 3) 관리자 복귀
  const handleReturnToAdmin = async () => {
    const adminUid = localStorage.getItem('impersonatorUid');
    if (!adminUid) return;
    try {
      const fn = httpsCallable(functions, 'createCustomToken');
      const { data } = await fn({ uid: adminUid });
      await signInWithCustomToken(auth, data.token);
      localStorage.removeItem('impersonatorUid');
      navigate('/admin/switch', { replace: true });
    } catch (err) {
      console.error(err);
      alert('관리자 복귀에 실패했습니다: ' + err.message);
    }
  };

  if (!userData) return null;

  return (
    <div className="profile-container">
      {/* 1) 헤더 */}
      <header className="profile-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <img src={backArrow} alt="뒤로가기" className="back-btn-icon" />
        </button>
        <span className="header-title">마이페이지</span>
      </header>

      {/* 2) 분리선 */}
      <div className="profile-separator" />

      {/* 3) 본문 */}
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

        <button className="btn" onClick={() => navigate('/shop')}>
          코인 구매하기
        </button>
        <button className="btn" onClick={() => navigate('/profile/edit')}>
          프로필 수정
        </button>
        <button className="btn" onClick={() => setShowLogoutConfirm(true)}>
          로그아웃
        </button>

        {/* 일반 사용자만 회원탈퇴 */}
        {!isAdmin && (
          <button
            className="text-link withdraw-text"
            onClick={() => navigate('/withdraw')}
          >
            회원탈퇴
          </button>
        )}

        {/* 이메일 계정 전환 후 항상 보이는 복귀 버튼 */}
        {!isAdmin && localStorage.getItem('impersonatorUid') && (
          <button className="btn" onClick={handleReturnToAdmin}>
            대시보드로 돌아가기
          </button>
        )}

        {/* 관리자 본인일 때만 */}
        {isAdmin && (
          <>
            <button
              className="btn"
              onClick={() => navigate('/admin/create')}
            >
              이메일로 계정 생성
            </button>
            <button
              className="btn"
              onClick={() => navigate('/admin/login')}
            >
              이메일로 로그인
            </button>
            <button
              className="btn"
              onClick={() => navigate('/admin/switch')}
            >
              계정 전환 대시보드
            </button>
          </>
        )}
      </div>

      {/* 로그아웃 확인 모달 */}
      {showLogoutConfirm && (
        <div className="logout-modal-overlay">
          <div className="logout-modal">
            <p>정말 로그아웃하시겠습니까?</p>
            <div className="logout-modal-buttons">
              <button className="logout-btn-confirm" onClick={doLogout}>
                네
              </button>
              <button
                className="logout-btn-cancel"
                onClick={() => setShowLogoutConfirm(false)}
              >
                아니요
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 이미지 확대 모달 */}
      {modalSrc && <ImageModal src={modalSrc} onClose={() => setModalSrc(null)} />}
    </div>
  );
}
