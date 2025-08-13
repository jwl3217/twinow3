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
  serverTimestamp,
  deleteDoc,
  limit,                 // ★ 추가: 중복 검사 최적화를 위한 limit
} from 'firebase/firestore';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import ImageModal                             from './ImageModal';
import '../styles/SignUp.css';

// ★ [코인] 기본 지급량(남/여 동일). 숫자만 바꾸면 전체 기본 코인 변경됩니다.
const DEFAULT_COINS = 2000;

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
  const [imgModalOpen, setImgModalOpen] = useState(false);

  // ✅ 추가: 확인(저장) 완료 여부를 동기적으로 보관하는 가드
  const confirmedRef = useRef(false);

  // 이 페이지에서는 하단 내비 숨김
  useEffect(() => {
    const nav = document.querySelector('.bottom-nav');
    if (nav) nav.style.display = 'none';
    return () => { if (nav) nav.style.display = ''; };
  }, []);

  // 회원가입 화면 진입 안내
  useEffect(() => {
    const key = 'signupNotice';
    const v = sessionStorage.getItem(key);
    if (v === 'noProfile') {
      sessionStorage.removeItem(key);
      alert('회원 정보가 없어 회원가입 페이지로 이동합니다');
    }
  }, []);

  // 관리자 프리필 생성 플로우
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
            coins:         DEFAULT_COINS, // ★ [코인] 프리필 계정 생성 시 지급 코인
            authProvider:  u.providerData[0].providerId,
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

  // Auth 상태 감시
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
      alert('사용할 수 없는 닉네임입니다.');
      return;
    }

    // ★ 닉네임 중복 검사 1: users 컬렉션
    const userDupSnap = await getDocs(
      query(collection(db, 'users'), where('nickname', '==', trimmed), limit(1))
    );
    if (!userDupSnap.empty) {
      alert('사용할 수 없는 닉네임입니다.');
      return;
    }

    // ★ 닉네임 중복 검사 2: posts 컬렉션(페르소나 전용)
    //   - 복합 where(==,==)는 인덱스 필요할 수 있어, nickname== 로만 가져와 personaMode 체크
    const personaNickSnap = await getDocs(
      query(collection(db, 'posts'), where('nickname', '==', trimmed), limit(3))
    );
    const personaNickExists = personaNickSnap.docs.some(
      d => d.data()?.personaMode === true
    );
    if (personaNickExists) {
      alert('사용할 수 없는 닉네임입니다.');
      return;
    }

    try {
      let finalPhotoURL = photoURL;
      if (photoFile) {
        const storageRef = ref(storage, `profiles/${user.uid}`);
        await uploadBytes(storageRef, photoFile);
        finalPhotoURL = await getDownloadURL(storageRef);
      }

      // ★ [코인] 여기서는 위 기본 지급량을 그대로 사용합니다.
      const coinsToSet = DEFAULT_COINS;

      await setDoc(doc(db, 'users', user.uid), {
        uid:           user.uid,
        email:         user.email,
        displayName:   user.displayName || '',
        photoURL:      finalPhotoURL,
        nickname:      trimmed,
        gender,
        age:           Number(age),
        region,
        coins:         coinsToSet, // ★ [코인] 가입 확정 시 지급 코인
        authProvider:  'password',
        createdAt:     serverTimestamp()
      });

      // ✅ 여기서 즉시 확정 플래그를 올려 언마운트 정리 차단
      confirmedRef.current = true;
      setCompleted(true);
      navigate('/feed', { replace: true });
    } catch (err) {
      console.error('회원정보 저장 실패:', err);
      alert('회원정보 저장 중 오류가 발생했습니다.');
    }
  };

  // 미완료 시 계정/문서 정리
  const purgeUnfinished = async () => {
    try {
      if (confirmedRef.current) return; // ✅ 확인 완료면 절대 정리하지 않음
      const u = auth.currentUser;
      if (!u) return;
      try { await deleteDoc(doc(db, 'users', u.uid)); } catch {}
      try {
        await u.delete();
      } catch {
        try { await auth.signOut(); } catch {}
      }
    } catch {}
  };

  // 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (!confirmedRef.current) purgeUnfinished();
    };
  }, []);

  // 탭/창 닫기 시도 시 정리
  useEffect(() => {
    const handler = () => {
      if (!confirmedRef.current) purgeUnfinished();
    };
    window.addEventListener('pagehide', handler);
    window.addEventListener('beforeunload', handler);
    return () => {
      window.removeEventListener('pagehide', handler);
      window.removeEventListener('beforeunload', handler);
    };
  }, []);

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

        {/* 버튼 아래 안내 문구(세로 배치) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
          <button
            onClick={() => document.getElementById('fileInput').click()}
            style={{ alignSelf: 'center' }}
          >
            프로필 사진 선택
          </button>
          <span className="photo-hint" style={{ color: '#666', fontSize: 12 }}>
            사진을 업로드하지 않을 경우 기본 프로필이 사용됩니다
          </span>
        </div>

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

      {imgModalOpen && (
        <ImageModal src={photoURL} onClose={() => setImgModalOpen(false)} />
      )}
    </div>
  );
}
