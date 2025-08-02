// src/components/BottomNav.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate }                from 'react-router-dom';
import { auth, db }                   from '../firebaseConfig';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';

import defaultProfile      from '../assets/default-profile.png';
import homeIcon            from '../assets/home-icon.png';
import shopIcon            from '../assets/shop-icon.png';
import messageIcon         from '../assets/message-icon.png';
import messageIconDot      from '../assets/message-icon-unread.png';

import '../styles/BottomNav.css';

export default function BottomNav() {
  const navigate = useNavigate();
  const uid = auth.currentUser?.uid;

  // 프로필 사진
  const [profilePhoto, setProfilePhoto] = useState(defaultProfile);
  // 읽지 않은 메시지 존재 여부
  const [hasUnread, setHasUnread]       = useState(false);

  // 1) 프로필 사진 로드
  useEffect(() => {
    if (!uid) return;
    getDoc(doc(db, 'users', uid))
      .then(snap => {
        const url = snap.data()?.photoURL;
        if (url) setProfilePhoto(url);
      })
      .catch(() => {});
  }, [uid]);

  // 2) 읽지 않은 메시지가 있는지 구독
  useEffect(() => {
    if (!uid) return;
    const roomsQ = query(
      collection(db, 'chatRooms'),
      where('members', 'array-contains', uid)
    );
    const unsub = onSnapshot(roomsQ, snap => {
      let unreadFound = false;
      snap.docs.forEach(d => {
        const count = d.data().unread?.[uid] || 0;
        if (count > 0) unreadFound = true;
      });
      setHasUnread(unreadFound);
    });
    return () => unsub();
  }, [uid]);

  return (
    <nav className="bottom-nav">
      {/* 내 프로필 */}
      <button className="nav-button" onClick={() => navigate('/profile')}>
        <img
          src={profilePhoto}
          alt="내 프로필"
          className="nav-icon profile-icon"
        />
      </button>

      {/* 홈 */}
      <button className="nav-button" onClick={() => navigate('/feed')}>
        <img src={homeIcon} alt="홈" className="nav-icon" />
      </button>

      {/* 메시지 (읽음/안읽음 아이콘 교체) */}
      <button className="nav-button" onClick={() => navigate('/messages')}>
        <img
          src={hasUnread ? messageIconDot : messageIcon}
          alt="메시지"
          className="nav-icon"
        />
      </button>

      {/* 샵 */}
      <button className="nav-button" onClick={() => navigate('/shop')}>
        <img src={shopIcon} alt="샵" className="nav-icon" />
      </button>
    </nav>
  );
}
