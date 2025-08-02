// src/components/AdminDashboard.jsx

import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword }  from 'firebase/auth';
import { auth, db }                   from '../firebaseConfig';
import {
  collection,
  onSnapshot,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import defaultProfile                  from '../assets/default-profile.png';
import '../styles/AdminDashboard.css';

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    // 이메일 가입(authProvider==='email') 유저만 구독
    const q = query(
      collection(db, 'users'),
      where('authProvider', '==', 'email')
    );
    const unsub = onSnapshot(q, async snap => {
      const list = [];
      for (const docSnap of snap.docs) {
        const data = { uid: docSnap.id, ...docSnap.data() };
        // 각 채팅방별 unread 합산
        const roomsQ    = query(
          collection(db, 'chatRooms'),
          where('members', 'array-contains', data.uid)
        );
        const roomsSnap = await getDocs(roomsQ);
        let cnt = 0;
        roomsSnap.docs.forEach(r => {
          cnt += r.data().unread?.[data.uid] || 0;
        });
        list.push({ ...data, unreadCount: cnt });
      }
      setUsers(list);
    });
    return () => unsub();
  }, []);

  const handleImpersonate = async u => {
    try {
      // 이메일 계정 비밀번호 고정: '12345678'
      await signInWithEmailAndPassword(auth, u.email, '12345678');
      window.location.href = '/feed';
    } catch (err) {
      console.error(err);
      alert('로그인 실패: ' + err.message);
    }
  };

  return (
    <div className="admin-dashboard">
      <h1>계정 전환 대시보드</h1>
      <ul className="user-list">
        {users.map(u => (
          <li
            key={u.uid}
            className="user-card"
            onClick={() => handleImpersonate(u)}
          >
            <img
              src={u.photoURL || defaultProfile}
              alt={u.nickname}
              className="avatar"
            />
            <span className="nickname">{u.nickname}</span>
            {u.unreadCount > 0 && (
              <span className="badge">{u.unreadCount}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
