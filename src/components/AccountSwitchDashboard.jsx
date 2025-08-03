// src/components/AccountSwitchDashboard.jsx

import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db }                  from '../firebaseConfig';
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  doc,
  getDoc
} from 'firebase/firestore';
import defaultProfile                 from '../assets/default-profile.png';
import messageIcon                    from '../assets/message-icon.png';
import messageIconUnread              from '../assets/message-icon-unread.png';
import '../styles/AccountSwitchDashboard.css';

export default function AccountSwitchDashboard() {
  const [users, setUsers] = useState([]);

  // BottomNav 숨기기
  useEffect(() => {
    const nav = document.querySelector('.bottom-nav');
    if (nav) nav.style.display = 'none';
    return () => { if (nav) nav.style.display = ''; };
  }, []);

  // ① URL 에 ?impersonate=UID 가 있으면 자동 로그인 후 피드로
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const targetUid = params.get('impersonate');
    if (targetUid) {
      (async () => {
        try {
          // Firestore 에서 이메일 가져오기
          const snap = await getDoc(doc(db, 'users', targetUid));
          if (!snap.exists()) throw new Error('해당 유저를 찾을 수 없습니다.');
          const { email } = snap.data();
          // 로그인
          await signInWithEmailAndPassword(auth, email, '12345678');
          // 피드로 이동
          window.location.href = '/feed';
        } catch (err) {
          console.error(err);
          alert('자동 로그인에 실패했습니다: ' + err.message);
        }
      })();
    }
  }, []);

  // ② users 구독
  useEffect(() => {
    const q = query(
      collection(db, 'users'),
      where('authProvider', 'in', ['email', 'password'])
    );
    const unsub = onSnapshot(q, async snap => {
      const list = await Promise.all(
        snap.docs.map(async d => {
          const data = { uid: d.id, ...d.data() };
          // unread 합산
          const roomsQ = query(
            collection(db, 'chatRooms'),
            where('members', 'array-contains', data.uid)
          );
          const roomsSnap = await getDocs(roomsQ);
          const unreadCount = roomsSnap.docs.reduce(
            (cnt, r) => cnt + (r.data().unread?.[data.uid] || 0),
            0
          );
          return { ...data, unreadCount };
        })
      );
      setUsers(list);
    });
    return () => unsub();
  }, []);

  // ③ 카드 클릭: 새 탭 열기만
  const handleSwitch = u => {
    const url = `${window.location.origin}/admin/switch?impersonate=${u.uid}`;
    window.open(url, '_blank');
  };

  return (
    <div className="switch-container">
      <header className="switch-header">
        <h1>계정 관리 페이지</h1>
      </header>
      <div className="separator" />
      <div className="accounts-grid">
        {users.map(u => (
          <div
            key={u.uid}
            className="account-card"
            onClick={() => handleSwitch(u)}
          >
            <img
              src={u.photoURL || defaultProfile}
              alt={u.nickname}
              className="account-avatar"
            />
            <div className="account-nickname">{u.nickname}</div>
            <div className="email">{u.email}</div>
            <img
              src={u.unreadCount > 0 ? messageIconUnread : messageIcon}
              alt="메시지 상태"
              className="message-icon"
            />
            {u.unreadCount > 0 && (
              <span className="account-badge">{u.unreadCount}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
