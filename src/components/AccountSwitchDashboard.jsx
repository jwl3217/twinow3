// src/components/AccountSwitchDashboard.jsx

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
import '../styles/AdminDashboard.css';

export default function AccountSwitchDashboard() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    // 이메일 가입(authProvider==='email') 유저만 구독
    const q = query(
      collection(db, 'users'),
      where('authProvider', '==', 'email')
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
      // 로그인 성공 시 대시보드 대신 피드로 이동
      window.location.href = '/feed';
    } catch (err) {
      console.error(err);
      alert('로그인 실패: ' + err.message);
    }
  };

  return (
    <div className="admin-dashboard">
      <h1>계정 관리 페이지</h1>
      <div className="user-list">
        {users.map(u => (
          <div
            key={u.uid}
            className="user-card"
            onClick={() => handleSwitch(u)}
          >
            <img
              src={u.photoURL || defaultProfile}
              alt={u.nickname}
              className="avatar"
            />
            <div className="user-info">
              <span className="nickname">{u.nickname}</span>
              <span className="email">{u.email}</span>
            </div>
            {u.unreadCount > 0 && (
              <span className="badge">{u.unreadCount}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
    