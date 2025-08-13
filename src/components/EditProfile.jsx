// src/components/EditProfile.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate }                  from 'react-router-dom';
import { auth, db, storage }            from '../firebaseConfig';
import defaultProfile                   from '../assets/default-profile.png';
import backArrow                        from '../assets/back-arrow.png';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, updateDoc }       from 'firebase/firestore';
import ImageModal                       from './ImageModal';
import '../styles/EditProfile.css';

export default function EditProfile() {
  const navigate = useNavigate();
  const user     = auth.currentUser;
  const [photoFile, setPhotoFile] = useState(null);
  const [photoURL, setPhotoURL]   = useState(defaultProfile);
  const [nickname, setNickname]   = useState('');
  const [age, setAge]             = useState('');
  const [region, setRegion]       = useState('');
  const [modalSrc, setModalSrc]   = useState(null);

  useEffect(() => {
    if (!user) return navigate('/', { replace: true });
    getDoc(doc(db, 'users', user.uid))
      .then(snap => {
        const d = snap.data() || {};
        setPhotoURL(d.photoURL || defaultProfile);
        setNickname(d.nickname || '');
        setAge((d.age ?? '').toString());
        setRegion(d.region || '');
      });
  }, [user, navigate]);

  const handleFileChange = e => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      setPhotoURL(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    if (!nickname || !age || !region) {
      alert('모든 항목을 입력해 주세요.');
      return;
    }
    try {
      let finalPhoto = photoURL;
      if (photoFile) {
        const storageRef = ref(storage, `profiles/${user.uid}`);
        await uploadBytes(storageRef, photoFile);
        finalPhoto = await getDownloadURL(storageRef);
      }
      await updateDoc(doc(db, 'users', user.uid), {
        photoURL: finalPhoto,
        nickname,
        age: Number(age),
        region
      });
      navigate('/feed', { replace: true });
    } catch (err) {
      console.error(err);
      alert('프로필 수정 중 오류가 발생했습니다.');
    }
  };

  // ✅ 추가: 기본 프로필로 즉시 변경
  const handleResetPhoto = async () => {
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        // DB에는 빈 값으로 저장해 앱 전역에서 기본 이미지로 폴백되게 함
        photoURL: ''
      });
      setPhotoFile(null);
      setPhotoURL(defaultProfile);
      alert('기본 프로필로 변경되었습니다.');
    } catch (err) {
      console.error(err);
      alert('기본 프로필로 변경 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="editprofile-container">
      {/* 1) 고정 헤더 */}
      <header className="editprofile-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <img src={backArrow} alt="뒤로가기" />
        </button>
        <span className="header-title">프로필 수정</span>
      </header>

      {/* 2) 분리선 */}
      <div className="editprofile-separator" />

      {/* 3) 본문 */}
      <div className="editprofile-body">
        <div className="photo-section">
          <img
            src={photoURL}
            alt="프로필"
            className="profile-circle"
            onClick={() => setModalSrc(photoURL)}
          />
          <button onClick={() => document.getElementById('fileInput').click()}>
            사진 변경
          </button>
          {/* ▼ 추가된 버튼: 동일한 스타일로 기본 프로필로 변경 */}
          <button onClick={handleResetPhoto} style={{ marginTop: 8 }}>
            기본 프로필로 변경
          </button>
          <input
            id="fileInput"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>

        <div className="field">
          <label>닉네임 :</label>
          <input value={nickname} onChange={e => setNickname(e.target.value)} />
        </div>

        <div className="field">
          <label>나이 :</label>
          <select value={age} onChange={e => setAge(e.target.value)}>
            {Array.from({ length: 62 }, (_, i) => 19 + i).map(n => (
              <option key={n} value={n}>{n}세</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>지역 :</label>
          <select value={region} onChange={e => setRegion(e.target.value)}>
            {[
              '서울','부산','대구','인천',
              '광주','대전','울산','세종',
              '경기도','강원도','충북','충남',
              '전북','전남','경북','경남','제주'
            ].map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </div>

        <button className="save-button" onClick={handleSave}>
          수정완료
        </button>
      </div>

      {/* 이미지 확대 모달 */}
      {modalSrc && (
        <ImageModal
          src={modalSrc}
          onClose={() => setModalSrc(null)}
        />
      )}
    </div>
  );
}
