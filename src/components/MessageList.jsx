// 경로: src/components/MessageList.jsx

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
          const otherLeft   = otherId === null;
          let userData = {};
          if (otherId) {
            const usSnap = await getDoc(doc(db, 'users', otherId));
            if (usSnap.exists()) {
              userData = usSnap.data();
            }
          }
          const unknownDel  = otherId && !userData.nickname;
          const iBlockedThem  = blockedUsers.includes(otherId);
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
      fetched.sort((a, b) => b.lastAt?.toMillis() - a.lastAt?.toMillis());
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

  const handleBlock = async otherId => {
    if (!window.confirm('정말 차단하시겠습니까?')) return;
    await updateDoc(doc(db, 'users', uid), {
      blockedUsers: arrayUnion(otherId)
    });
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
            alt="뒤로가기"
            className="back-btn-icon"
          />
        </button>
        <span className="header-title">메시지 목록</span>
      </header>

      {/* 2) 분리선 */}
      <div className="msglist-separator" />

      {/* 3) 본문 스크롤 영역 */}
      <div className="msglist-body">
        {rooms.map(room => (
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
                <div
                  className="room-last"
                  style={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
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
                <button onClick={() => handleBlock(room.otherId)}>
                  차단하기
                </button>
                <button onClick={() => navigate(`/report/${room.otherId}`)}>
                  신고
                </button>
              </div>
            )}
          </div>
        ))}

        {leaveId && (
          <>
            <div className="modal-overlay" />
            <div className="leave-confirm">
              <p>
                정말 채팅방을 나가시겠습니까?
                <br />
                나가시면 이후 이 채팅에서는 메시지를 보낼 수 없습니다.
              </p>
              <button onClick={confirmLeave}>네</button>
              <button onClick={() => setLeaveId(null)}>아니요</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
