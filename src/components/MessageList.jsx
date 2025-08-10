// src/components/MessageList.jsx

import React, { useState, useEffect } from 'react';
import backArrow from '../assets/back-arrow.png';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebaseConfig';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  arrayRemove,
  arrayUnion
} from 'firebase/firestore';
import defaultProfile from '../assets/default-profile.png';
import '../styles/MessageList.css';

export default function MessageList() {
  const navigate = useNavigate();
  const uid = auth.currentUser?.uid;

  const [rooms, setRooms] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [leaveId, setLeaveId] = useState(null);

  // 1) 내 차단 목록 로드
  useEffect(() => {
    if (!uid) return;
    getDoc(doc(db, 'users', uid)).then(snap => {
      setBlockedUsers(snap.data()?.blockedUsers || []);
    });
  }, [uid]);

  // 2) 채팅방 목록 구독
  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, 'chatRooms'),
      where('members', 'array-contains', uid)
    );
    const unsub = onSnapshot(q, async snap => {
      const fetched = await Promise.all(
        snap.docs.map(async d => {
          const room = { id: d.id, ...d.data() };
          const otherId = room.members.find(m => m !== uid) || null;

          // 상태 판별
          const otherLeft = otherId === null;
          let userData = {};
          if (otherId) {
            const usSnap = await getDoc(doc(db, 'users', otherId));
            if (usSnap.exists()) {
              userData = usSnap.data();
            }
          }
          const unknownDel    = otherId && !userData.nickname;
          const iBlockedThem  = otherId ? blockedUsers.includes(otherId) : false;
          const theyBlockedMe = userData.blockedUsers?.includes(uid);

          // 표시값 결정
          const cannotSend = iBlockedThem || theyBlockedMe || otherLeft || unknownDel;
          const photoURL = cannotSend
            ? defaultProfile
            : (userData.photoURL || defaultProfile);
          const nickname = (otherLeft || unknownDel)
            ? '알 수 없음'
            : userData.nickname;

          return {
            id:          room.id,
            otherId,
            photoURL,
            nickname,
            lastMessage: room.lastMessage,
            lastAt:      room.lastAt,
            unread:      room.unread?.[uid] || 0
          };
        })
      );
      fetched.sort((a, b) => (b.lastAt?.toMillis?.() || 0) - (a.lastAt?.toMillis?.() || 0));
      setRooms(fetched);
    });
    return () => unsub();
  }, [uid, blockedUsers]);

  const handleLeave = id => setLeaveId(id);

  const confirmLeave = async () => {
    if (!leaveId) return;
    await updateDoc(doc(db, 'chatRooms', leaveId), {
      members: arrayRemove(uid)
    });
    setLeaveId(null);
    setMenuOpenId(null);
  };

  // 차단
  const handleBlock = async (otherId) => {
    if (!otherId) return;
    if (!window.confirm('정말 차단하시겠습니까?')) return;
    await updateDoc(doc(db, 'users', uid), {
      blockedUsers: arrayUnion(otherId)
    });
    setBlockedUsers(prev => (prev.includes(otherId) ? prev : [...prev, otherId]));
    setMenuOpenId(null);
  };

  // 차단 해제 (브라우저 기본 확인창)
  const handleUnblock = async (otherId) => {
    if (!otherId) return;
    if (!window.confirm('차단을 해제하시겠습니까?')) return;
    await updateDoc(doc(db, 'users', uid), {
      blockedUsers: arrayRemove(otherId)
    });
    setBlockedUsers(prev => prev.filter(x => x !== otherId));
    setMenuOpenId(null);
  };

  return (
    <div className="msglist-container">
      {/* 1) 고정 헤더 */}
      <header className="msglist-header">
        <button
          className="back-button"
          onClick={() => navigate(-1)}
        >
          <img
            src={backArrow}
            alt="뒤루가기"
            className="back-btn-icon"
          />
        </button>
        <span className="header-title">메시지 목록</span>
      </header>

      {/* 2) 분리선 */}
      <div className="msglist-separator" />

      {/* 3) 본문 스크롤 영역 */}
      <div className="msglist-body">
        {rooms.map(room => {
          const isBlockedByMe = room.otherId ? blockedUsers.includes(room.otherId) : false;
          return (
            <div key={room.id} className="msglist-card">
              <div
                className="room-info"
                onClick={async () => {
                  await updateDoc(doc(db, 'chatRooms', room.id), {
                    [`unread.${uid}`]: 0
                  });
                  navigate(`/chat/${room.id}`);
                }}
              >
                <img
                  src={room.photoURL}
                  alt=""
                  className="room-profile"
                />
                <div className="room-text">
                  <div className="room-header">
                    <span className="room-nick">{room.nickname}</span>
                    {room.unread > 0 && (
                      <span className="room-unread">
                        {room.unread > 9 ? '9+' : room.unread} 읽지않음
                      </span>
                    )}
                  </div>
                  <div className="room-last">
                    {room.lastMessage || ''}
                  </div>
                </div>
              </div>

              <button
                className="room-menu-btn"
                onClick={e => {
                  e.stopPropagation();
                  setMenuOpenId(menuOpenId === room.id ? null : room.id);
                }}
              >
                ⋮
              </button>
              {menuOpenId === room.id && (
                <div className="room-menu">
                  <button onClick={() => handleLeave(room.id)}>
                    채팅방 나가기
                  </button>

                  {/* 내가 차단한 상태면 '차단 해제하기' */}
                  {isBlockedByMe ? (
                    <button
                      onClick={() => handleUnblock(room.otherId)}
                      disabled={!room.otherId}
                    >
                      차단 해제하기
                    </button>
                  ) : (
                    <button
                      onClick={() => handleBlock(room.otherId)}
                      disabled={!room.otherId}
                    >
                      차단하기
                    </button>
                  )}

                  <button onClick={() => navigate(`/report/${room.otherId}`)}>
                    신고
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 모달: 채팅방 나가기 (기존 그대로 유지) */}
      {leaveId && (
        <>
          <div
            className="modal-overlay"
            onClick={() => setLeaveId(null)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(0,0,0,0.3)',
              zIndex: 1000
            }}
          />
          <div
            className="leave-confirm"
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: '#fff',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              zIndex: 1001,
              textAlign: 'center'
            }}
          >
            <p style={{ marginBottom: '16px' }}>정말 채팅방을 나가시겠습니까?</p>
            <button
              onClick={confirmLeave}
              style={{
                marginRight: '8px',
                padding: '8px 16px',
                border: 'none',
                borderRadius: '4px',
                background: '#1da1f2',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              예
            </button>
            <button
              onClick={() => setLeaveId(null)}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '4px',
                background: '#eee',
                cursor: 'pointer'
              }}
            >
              아니요
            </button>
          </div>
        </>
      )}
    </div>
  );
}
