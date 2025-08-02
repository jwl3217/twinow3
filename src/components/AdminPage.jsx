// src/components/AdminPage.jsx

import React, { useState, useEffect } from 'react';
import { httpsCallable }               from 'firebase/functions';
import { functions, db, auth, storage } from '../firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { setDoc, doc, serverTimestamp }  from 'firebase/firestore';
import defaultProfile                  from '../assets/default-profile.png';
import '../styles/AdminPage.css';

export default function AdminPage() {
  // (선택) 실제 유저 목록을 가져오려면 Cloud Function 혹은 Firestore 쿼리를 추가하세요.
  const [users, setUsers]     = useState([]);
  const [showModal, setShowModal] = useState(false);

  // 생성 폼 상태
  const [photoFile, setPhotoFile] = useState(null);
  const [photoURL, setPhotoURL]   = useState(defaultProfile);
  const [email, setEmail]         = useState('');
  const [nickname, setNickname]   = useState('');
  const [gender, setGender]       = useState('');
  const [age, setAge]             = useState('');
  const [region, setRegion]       = useState('');

  const createUser = httpsCallable(functions, 'createUser');

  const handleFileChange = e => {
    const f = e.target.files[0];
    if (f) {
      setPhotoFile(f);
      setPhotoURL(URL.createObjectURL(f));
    }
  };

  const handleCreate = async () => {
    if (!email || !nickname || !gender || !age || !region) {
      alert('모든 항목을 입력해 주세요.');
      return;
    }
    try {
      // 관리자 토큰 갱신
      await auth.currentUser.getIdToken(true);

      // 임시 비밀번호 생성
      const randomPw = Math.random().toString(36).slice(-8);

      // Auth 사용자 생성 (Cloud Function 호출)
      const res = await createUser({ email, password: randomPw });
      const uid = res.data.uid;

      // 프로필 사진 업로드
      let finalPhoto = photoURL;
      if (photoFile) {
        const storageRef = ref(storage, `profiles/${uid}`);
        await uploadBytes(storageRef, photoFile);
        finalPhoto = await getDownloadURL(storageRef);
      }

      // Firestore에 유저 문서 생성
      await setDoc(doc(db, 'users', uid), {
        uid,
        photoURL:  finalPhoto,
        nickname,
        gender,
        age:       Number(age),
        region,
        coins:     200,
        createdAt: serverTimestamp()
      });

      alert(`계정이 생성되었습니다.\n임시 비밀번호: ${randomPw}`);

      // 폼 초기화 및 모달 닫기
      setPhotoFile(null);
      setPhotoURL(defaultProfile);
      setEmail('');
      setNickname('');
      setGender('');
      setAge('');
      setRegion('');
      setShowModal(false);

      // (선택) 유저 목록 새로고침 로직 추가
    } catch (err) {
      alert('생성 중 오류: ' + err.message);
    }
  };

  return (
    <div className="admin-page">
      <h1>계정 관리 대시보드</h1>

      <button className="btn-create" onClick={() => setShowModal(true)}>
        계정 생성
      </button>

      <h2>생성된 사용자 목록</h2>
      <div className="user-list">
        {users.map(u => (
          <div key={u.uid} className="user-card">
            <img
              src={u.photoURL || defaultProfile}
              alt=""
              className="profile-pic"
            />
            <div className="info">
              <p>{u.nickname}</p>
              <p>{u.email}</p>
              <p>{u.createdAt?.toDate().toLocaleString()}</p>
            </div>
            <input type="checkbox" />
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowModal(false)}>
              ×
            </button>

            <h2>계정 생성 (관리자용)</h2>
            <div className="photo-section">
              <img src={photoURL} alt="프로필" className="profile-circle" />
              <button
                onClick={() => document.getElementById('fileInput').click()}
              >
                사진 선택
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
              <label>이메일:</label>
              <input value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="field">
              <label>닉네임:</label>
              <input
                value={nickname}
                onChange={e => setNickname(e.target.value)}
              />
            </div>
            <div className="field">
              <label>성별:</label>
              <select
                value={gender}
                onChange={e => setGender(e.target.value)}
              >
                <option value="">선택</option>
                <option value="male">남자</option>
                <option value="female">여자</option>
              </select>
            </div>
            <div className="field">
              <label>나이:</label>
              <select value={age} onChange={e => setAge(e.target.value)}>
                <option value="">선택</option>
                {Array.from({ length: 62 }, (_, i) => 19 + i).map(n => (
                  <option key={n} value={n}>
                    {n}세
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>지역:</label>
              <select
                value={region}
                onChange={e => setRegion(e.target.value)}
              >
                <option value="">선택</option>
                {[
                  '서울','부산','대구','인천','광주','대전','울산','세종',
                  '경기도','강원도','충북','충남','전북','전남','경북','경남','제주'
                ].map(loc => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            <button className="confirm-button" onClick={handleCreate}>
              생성하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
