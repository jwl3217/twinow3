// 경로: src/components/AccountSwitchDashboard.jsx

import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db }                  from '../firebaseConfig';
import {
  collection,
  onSnapshot,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import defaultProfile                 from '../assets/default-profile.png';
import messageIcon                    from '../assets/message-icon.png';
import messageIconUnread              from '../assets/message-icon-unread.png';
import '../styles/AccountSwitchDashboard.css'; // 올바른 CSS 파일을 임포트합니다

export default function AccountSwitchDashboard() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    // 이메일/비밀번호 가입(authProvider==='email' 또는 'password') 유저만 구독
    const q = query(
      collection(db, 'users'),
      where('authProvider', 'in', ['email', 'password'])
    );
    const unsub = onSnapshot(q, async snap => {
      const list = await Promise.all(
        snap.docs.map(async docSnap => {
          const data = { uid: docSnap.id, ...docSnap.data() };
          // 각 채팅방의 unread 합산
          const roomsQ    = query(
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

  const handleSwitch = async user => {
    try {
      // 전환 전 관리자 UID 저장
      localStorage.setItem('impersonatorUid', auth.currentUser.uid);
      // 이메일 계정 로그인 (비밀번호는 모두 12345678)
      await signInWithEmailAndPassword(auth, user.email, '12345678');
      // 로그인 성공 시 피드로 이동
      window.location.href = '/feed';
    } catch (err) {
      console.error(err);
      alert('로그인 실패: ' + err.message);
    }
  };

  return (
    <div className="switch-container">
      <div className="switch-header">
        <h1>계정 관리 페이지</h1>
        <div className="alerts-summary">
          총 <span className="alerts-count">{users.length}</span>명
        </div>
      </div>

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
            <p className="account-nickname">{u.nickname}</p>
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
