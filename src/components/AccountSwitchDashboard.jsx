// src/components/AccountSwitchDashboard.jsx
import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { auth, db } from '../firebaseConfig';
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import defaultProfile from '../assets/default-profile.png';
import messageIcon from '../assets/message-icon.png';
import messageIconUnread from '../assets/message-icon-unread.png';
import '../styles/AccountSwitchDashboard.css';

export default function AccountSwitchDashboard() {
  const [users, setUsers] = useState([]);

  // BottomNav 숨기기
  useEffect(() => {
    const nav = document.querySelector('.bottom-nav');
    if (nav) nav.style.display = 'none';
    return () => { if (nav) nav.style.display = ''; };
  }, []);

  // URL ?impersonate=UID 자동 로그인
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const targetUid = params.get('impersonate');
    if (targetUid) {
      (async () => {
        try {
          const snap = await getDoc(doc(db, 'users', targetUid));
          if (!snap.exists()) throw new Error('해당 유저를 찾을 수 없습니다.');
          const { email } = snap.data();
          await signInWithEmailAndPassword(auth, email, '12345678');
          window.location.href = '/feed';
        } catch (err) {
          console.error(err);
          alert('자동 로그인에 실패했습니다: ' + err.message);
        }
      })();
    }
  }, []);

  // 이메일 가입 계정만 구독
  useEffect(() => {
    const q = query(collection(db, 'users'), where('authProvider', '==', 'email'));
    const unsub = onSnapshot(q, async snap => {
      const list = await Promise.all(
        snap.docs.map(async d => {
          const data = { uid: d.id, ...d.data() };
          // 각 유저의 unread 합산
          const roomsQ = query(collection(db, 'chatRooms'), where('members', 'array-contains', data.uid));
          const roomsSnap = await getDocs(roomsQ);
          const unreadCount = roomsSnap.docs.reduce((cnt, r) => cnt + (r.data().unread?.[data.uid] || 0), 0);
          return { ...data, unreadCount };
        })
      );
      setUsers(list);
    });
    return () => unsub();
  }, []);

  // 새 이메일 계정 생성 (관리자 세션 유지)
  const handleCreateEmailAccount = async () => {
    const email = prompt('새 계정의 이메일을 입력하세요 (예: user@example.com)');
    if (!email) return;
    const nickname = (prompt('표시할 닉네임을 입력하세요') || email.split('@')[0]).trim();
    if (!nickname) return;

    try {
      // 현재 앱 설정을 재사용해 세컨더리 앱 생성 → 관리자 세션 영향 없음
      const secondary = initializeApp(auth.app.options, 'secondary-' + Date.now());
      const secondaryAuth = getAuth(secondary);

      const cred = await createUserWithEmailAndPassword(secondaryAuth, email, '12345678');
      const newUid = cred.user.uid;

      // ✅ 앱이 기대하는 기본 필드들을 모두 채워넣기
      await setDoc(doc(db, 'users', newUid), {
        email: email.toLowerCase(),
        nickname,
        authProvider: 'email',
        photoURL: '',
        coins: 0,                 // 숫자
        gender: 'male',           // 'male' | 'female'
        age: 20,                  // 숫자
        region: '미설정',          // 문자열
        intro: '',
        blockedUsers: [],         // 배열
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 세컨더리 앱 정리
      await secondaryAuth.signOut().catch(() => {});
      await deleteApp(secondary).catch(() => {});

      alert('이메일 계정이 생성되었습니다.');
    } catch (err) {
      console.error(err);
      alert('계정 생성 실패: ' + (err?.message || err));
    }
  };

  // 카드 클릭 → 새 탭에서 자동 로그인 플로우
  const handleSwitch = u => {
    const url = `${window.location.origin}/admin/switch?impersonate=${u.uid}`;
    window.open(url, '_blank');
  };

  return (
    <div className="switch-container">
      <header className="switch-header">
        <h1>계정 관리 페이지</h1>
        <button
          type="button"
          className="create-email-btn"
          onClick={handleCreateEmailAccount}
          style={{
            marginLeft: 'auto',
            padding: '8px 12px',
            border: 'none',
            borderRadius: 6,
            background: '#1da1f2',
            color: '#fff',
            cursor: 'pointer'
          }}
        >
          이메일로 계정 생성
        </button>
      </header>

      <div className="separator" />

      <div className="accounts-grid">
        {users.map(u => (
          <div key={u.uid} className="account-card" onClick={() => handleSwitch(u)}>
            <img src={u.photoURL || defaultProfile} alt={u.nickname} className="account-avatar" />
            <div className="account-nickname">{u.nickname}</div>
            <div className="email">{u.email}</div>
            <img
              src={u.unreadCount > 0 ? messageIconUnread : messageIcon}
              alt="메시지 상태"
              className="message-icon"
            />
            {u.unreadCount > 0 && <span className="account-badge">{u.unreadCount}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
