// 경로: src/components/SignUp.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation }           from 'react-router-dom';
import { auth, db, storage }                  from '../firebaseConfig';
import defaultProfile                         from '../assets/default-profile.png';
import { ref, uploadBytes, getDownloadURL }   from 'firebase/storage';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import ImageModal                             from './ImageModal';
import '../styles/SignUp.css';

export default function SignUp() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const prefillEmail    = location.state?.email    || '';
  const prefillPassword = location.state?.password || '';
  const didPrefillRef   = useRef(false);

  const [user, setUser]             = useState(null);
  const [photoFile, setPhotoFile]   = useState(null);
  const [photoURL, setPhotoURL]     = useState(defaultProfile);
  const [nickname, setNickname]     = useState('');
  const [gender, setGender]         = useState('');
  const [age, setAge]               = useState('');
  const [region, setRegion]         = useState('');
  const [completed, setCompleted]   = useState(false);
  const [invalidModal, setInvalidModal] = useState(false);
  const [imgModalOpen, setImgModalOpen] = useState(false);

  // ✅ 추가: 회원가입 화면 진입 시 안내(브라우저 기본 모달)
  useEffect(() => {
    const key = 'signupNotice';
    const v = sessionStorage.getItem(key);
    if (v === 'noProfile') {
      sessionStorage.removeItem(key);
      alert('회원 정보가 없어 회원가입 페이지로 이동합니다');
    }
  }, []);

  // 1) 관리자 화면에서 이메일/비번 전달(prefill) 시: Auth 계정 생성 + Firestore 문서
  useEffect(() => {
    if (prefillEmail && prefillPassword && !didPrefillRef.current) {
      didPrefillRef.current = true;
      createUserWithEmailAndPassword(auth, prefillEmail, prefillPassword)
        .then(async ({ user: u }) => {
          await setDoc(doc(db, 'users', u.uid), {
            uid:           u.uid,
            displayName:   u.displayName || '',
            photoURL:      u.photoURL || null,
            nickname:      '',
            gender:        '',
            age:           null,
            region:        '',
            // ✅ 기본값: 남자 기본과 동일하게 100 코인
            coins:         100,
            authProvider:  u.providerData[0].providerId, // 가입 프로바이더 저장
            createdAt:     serverTimestamp()
          });
        })
        .catch(err => {
          console.error(err);
          alert('계정 생성 실패: ' + err.message);
          navigate('/', { replace: true });
        });
    }
  }, [prefillEmail, prefillPassword, navigate]);

  // 2) Auth 상태 감시 (prefill flow 제외)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      if (prefillEmail && prefillPassword && !completed) {
        setUser(u);
        return;
      }
      if (!u) {
        navigate('/', { replace: true });
        return;
      }
      setUser(u);
      const snap = await getDoc(doc(db, 'users', u.uid));
      const data = snap.data() || {};
      if (data.nickname && data.gender && data.region) {
        setCompleted(true);
        navigate('/feed', { replace: true });
      }
    });
    return () => unsub();
  }, [navigate, prefillEmail, prefillPassword, completed]);

  const handleFileChange = e => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      setPhotoURL(URL.createObjectURL(file));
    }
  };

  const allFilled = nickname && gender && age && region;

  const handleConfirm = async () => {
    const trimmed = nickname.trim();
    const forbidden = ['알 수 없음','알수없음','알수 없음'];
    if (!trimmed || forbidden.some(t => trimmed.includes(t))) {
      setInvalidModal(true);
      return;
    }
    // 중복 닉네임 검사
    const q = query(collection(db, 'users'), where('nickname','==',trimmed));
    const snap = await getDocs(q);
    if (!snap.empty) {
      setInvalidModal(true);
      return;
    }
    try {
      let finalPhotoURL = photoURL;
      if (photoFile) {
        const storageRef = ref(storage, `profiles/${user.uid}`);
        await uploadBytes(storageRef, photoFile);
        finalPhotoURL = await getDownloadURL(storageRef);
      }

      // ✅ 성별에 따라 코인 부여: 여자=5000, 그 외(남자 포함)=100
      const coinsToSet = (gender === 'female') ? 5000 : 100;

      await setDoc(doc(db, 'users', user.uid), {
        uid:           user.uid,
        email:         user.email,
        displayName:   user.displayName || '',
        photoURL:      finalPhotoURL,
        nickname:      trimmed,
        gender,
        age:           Number(age),
        region,
        coins:         coinsToSet,     // ← 조건부 반영
        authProvider:  'password',     // 이메일/비번 가입임을 명시
        createdAt:     serverTimestamp()
      });
      setCompleted(true);
      navigate('/feed', { replace: true });
    } catch (err) {
      console.error('회원정보 저장 실패:', err);
      alert('회원정보 저장 중 오류가 발생했습니다.');
    }
  };

  if (!user) return null;

  return (
    <div className="signup-container">
      <h2>회원정보 입력</h2>

      <div className="photo-section">
        <img
          src={photoURL}
          alt="프로필"
          className="profile-circle"
          style={{ cursor: 'pointer' }}
          onClick={() => setImgModalOpen(true)}
        />
        <button onClick={() => document.getElementById('fileInput').click()}>
          프로필 사진 선택
        </button>
        <input
          id="fileInput"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <p className="photo-hint">
          사진을 선택하지 않으면 기본 프로필이 사용됩니다.
        </p>
      </div>

      <div className="field">
        <label>닉네임 :</label>
        <input
          type="text"
          value={nickname}
          onChange={e => setNickname(e.target.value)}
        />
      </div>

      <div className="field">
        <label>성별 :</label>
        <select value={gender} onChange={e => setGender(e.target.value)}>
          <option value="">선택</option>
          <option value="male">남자</option>
          <option value="female">여자</option>
        </select>
      </div>

      <div className="field">
        <label>나이 :</label>
        <select value={age} onChange={e => setAge(e.target.value)}>
          <option value="">선택</option>
          {Array.from({ length: 62 }, (_, i) => 19 + i).map(n => (
            <option key={n} value={n}>{n}세</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>지역 :</label>
        <select value={region} onChange={e => setRegion(e.target.value)}>
          <option value="">선택</option>
          {[
            '서울','부산','대구','인천','광주','대전','울산','세종',
            '경기도','강원도','충북','충남','전북','전남','경북','경남','제주'
          ].map(loc => (
            <option key={loc} value={loc}>{loc}</option>
          ))}
        </select>
      </div>

      {/* ✅ 약관 버튼/모달 제거, 확인 버튼만 남김 */}
      <button
        className="confirm-button"
        onClick={handleConfirm}
        disabled={!allFilled}
        style={{
          background: allFilled ? undefined : '#ccc',
          cursor:    allFilled ? undefined : 'not-allowed'
        }}
      >
        확인
      </button>

      {invalidModal && (
        <div className="terms-modal">
          <div className="terms-content">
            <p style={{ textAlign: 'center' }}>사용할 수 없는 닉네임입니다</p>
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button
                className="terms-close-button"
                onClick={() => setInvalidModal(false)}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {imgModalOpen && (
        <ImageModal src={photoURL} onClose={() => setImgModalOpen(false)} />
      )}
    </div>
  );
}
