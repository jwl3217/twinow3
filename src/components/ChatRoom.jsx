// src/components/ChatRoom.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate }            from 'react-router-dom';
import { auth, db, storage }                 from '../firebaseConfig';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  updateDoc,
  arrayRemove,
  arrayUnion,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import defaultProfile from '../assets/default-profile.png';
import backArrow      from '../assets/back-arrow.png';
import threeDotsIcon  from '../assets/three-dots-icon.png';
import sendIcon       from '../assets/send-icon.png';
import CoinModal      from './CoinModal';
import ImageModal     from './ImageModal';
import '../styles/ChatRoom.css';

export default function ChatRoom() {
  const { roomId } = useParams();
  const navigate  = useNavigate();
  const me        = auth.currentUser?.uid;

  // --- bottom-nav 숨김 처리를 위한 사이드 이펙트 ---
  useEffect(() => {
    const bottomNav = document.querySelector('.bottom-nav');
    if (bottomNav) bottomNav.style.display = 'none';
    return () => {
      if (bottomNav) bottomNav.style.display = '';
    };
  }, []);

  const [room,         setRoom]         = useState(null);
  const [otherUser,    setOtherUser]    = useState({});
  const [otherUid,     setOtherUid]     = useState(null);
  const [messages,     setMessages]     = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [modalType,    setModalType]    = useState(null);
  const [input,        setInput]        = useState('');
  const [imgModalSrc,  setImgModalSrc]  = useState(null);
  const bottomRef                       = useRef();

  // 파일 첨부 ref & 핸들러
  const fileInputRef = useRef(null);
  const handleAttachClick = () => fileInputRef.current.click();
  const handleFileChange = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const path = `chatRooms/${roomId}/${Date.now()}_${file.name}`;
    const ref  = storageRef(storage, path);
    await uploadBytes(ref, file);
    const url  = await getDownloadURL(ref);
    await addDoc(collection(db, 'chatRooms', roomId, 'messages'), {
      imageUrl: url,
      sender: me,
      sentAt: serverTimestamp()
    });
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 내 차단 목록 로드
  useEffect(() => {
    if (!me) return;
    getDoc(doc(db, 'users', me)).then(snap => {
      setBlockedUsers(snap.data()?.blockedUsers || []);
    });
  }, [me]);

  // 방 정보 & 상대 & 메시지 구독
  useEffect(() => {
    if (!me) {
      navigate('/', { replace: true });
      return;
    }
    if (!roomId) {
      navigate('/messages', { replace: true });
      return;
    }

    const roomRef = doc(db, 'chatRooms', roomId);
    const unsubR = onSnapshot(roomRef, snap => {
      if (!snap.exists()) {
        alert('채팅방이 없습니다.');
        navigate('/messages', { replace: true });
        return;
      }
      const data = snap.data();
      setRoom(data);

      const other = data.members.find(u => u !== me) || null;
      setOtherUid(other);

      if (other) {
        getDoc(doc(db, 'users', other)).then(us => {
          setOtherUser(us.exists() ? us.data() : { deleted: true });
        });
      } else {
        setOtherUser({});
      }
    });

    const unsubM = onSnapshot(
      query(
        collection(db, 'chatRooms', roomId, 'messages'),
        orderBy('sentAt')
      ),
      snap => {
        setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setTimeout(
          () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }),
          50
        );
      }
    );

    return () => {
      unsubR();
      unsubM();
    };
  }, [navigate, roomId, me]);

  const iBlockedThem  = blockedUsers.includes(otherUid);
  const theyBlockedMe = otherUser.blockedUsers?.includes(me);
  const otherLeft     = otherUid === null;
  const unknownDel    = otherUser.deleted;
  const cannotSend    = iBlockedThem || theyBlockedMe || otherLeft || unknownDel;

  const avatarSrc = cannotSend
    ? defaultProfile
    : otherUser.photoURL || defaultProfile;

  const displayName = (otherLeft || unknownDel)
    ? '알 수 없음'
    : otherUser.nickname;

  const formatRelativeTime = ts => {
    if (!ts?.toMillis) return '';
    const diff = Date.now() - ts.toMillis();
    const sec  = Math.floor(diff / 1000);
    if (sec < 60) return `${sec}초 전`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}분 전`;
    const hr  = Math.floor(min / 60);
    if (hr < 24) return `${hr}시간 전`;
    const day = Math.floor(hr / 24);
    return `${day}일 전`;
  };

  const actuallySend = async () => {
    const txt = input.trim();
    if (!txt) return;
    await addDoc(collection(db, 'chatRooms', roomId, 'messages'), {
      text:   txt,
      sender: me,
      sentAt: serverTimestamp()
    });
    setInput('');
    await updateDoc(doc(db, 'chatRooms', roomId), {
      lastMessage: txt,
      lastAt:      serverTimestamp(),
      [`unread.${otherUid}`]: increment(1)
    });
  };

  const handleUseCoinConfirm = async () => {
    await updateDoc(doc(db, 'users', me), { coins: increment(-100) });
    await updateDoc(doc(db, 'chatRooms', roomId), {
      [`unlocked.${me}`]: true
    });
    setModalType(null);
    actuallySend();
  };

  const handleSend = async () => {
    const unlocked = room?.unlocked?.[me];
    const hasOther  = messages.some(m => m.sender !== me);
    if (!unlocked && hasOther) {
      const snap  = await getDoc(doc(db, 'users', me));
      const coins = snap.data()?.coins || 0;
      setModalType(coins < 100 ? 'noCoin' : 'useCoin');
      return;
    }
    actuallySend();
  };

  const handleLeave   = async () => {
    setMenuOpen(false);
    if (!window.confirm('정말 채팅방을 나가시겠습니까?')) return;
    await updateDoc(doc(db, 'chatRooms', roomId), {
      members: arrayRemove(me)
    });
    navigate('/messages', { replace: true });
  };
  const handleBlock   = async () => {
    setMenuOpen(false);
    if (!window.confirm('정말 차단하시겠습니까?')) return;
    await updateDoc(doc(db, 'users', me), {
      blockedUsers: arrayUnion(otherUid)
    });
    setBlockedUsers(prev => [...prev, otherUid]);
  };
  const handleUnblock = async () => {
    setMenuOpen(false);
    if (!window.confirm('차단을 해제하시겠습니까?')) return;
    await updateDoc(doc(db, 'users', me), {
      blockedUsers: arrayRemove(otherUid)
    });
    setBlockedUsers(prev => prev.filter(u => u !== otherUid));
  };
  const handleReport  = () => {
    setMenuOpen(false);
    if (otherUid) navigate(`/report/${otherUid}`);
  };

  if (!room) return null;

  return (
    <div className="chatroom-container">
      <header className="chatroom-header">
        <button onClick={() => navigate(-1)} className="back-btn back-button">
          <img src={backArrow} alt="뒤로가기" />
        </button>
        <img
          src={avatarSrc}
          alt="프로필"
          className="chatroom-avatar"
          style={{ cursor: 'pointer' }}
          onClick={() => setImgModalSrc(avatarSrc)}
        />
        <span className="chatroom-name">{displayName}</span>
        <button className="dots-btn" onClick={() => setMenuOpen(o => !o)}>
          <img src={threeDotsIcon} alt="메뉴" />
        </button>
        {menuOpen && (
          <div className="chatroom-menu-dropdown">
            <button onClick={handleLeave}>채팅방 나가기</button>
            {iBlockedThem ? (
              <button onClick={handleUnblock}>차단 해제하기</button>
            ) : (
              <button onClick={handleBlock}>차단하기</button>
            )}
            <button onClick={handleReport}>신고</button>
          </div>
        )}
      </header>

      <div className="chatroom-messages">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`msg-item ${msg.sender === me ? 'me' : 'other'}`}
          >
            {msg.imageUrl && (
              <img
                src={msg.imageUrl}
                alt="첨부"
                style={{ maxWidth: '200px', borderRadius: '8px' }}
                onClick={() => setImgModalSrc(msg.imageUrl)}
              />
            )}
            {msg.text && <p className="msg-text">{msg.text}</p>}
            <span className="msg-time">{formatRelativeTime(msg.sentAt)}</span>
          </div>
        ))}

        {otherLeft && (
          <div className="chatroom-exit">상대가 채팅방을 나갔습니다.</div>
        )}
        {theyBlockedMe && (
          <div className="chatroom-exit">상대가 나를 차단했습니다.</div>
        )}
        <div ref={bottomRef} />
      </div>

      {cannotSend ? (
        <div className="chatroom-blocked">
          {iBlockedThem ? '차단한 멤버입니다' : '채팅을 보낼 수 없습니다'}
        </div>
      ) : (
        <>
          <div className="chatroom-input-wrap">
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <button className="attach-btn" onClick={handleAttachClick}>
              +
            </button>
            <input
              className="chatroom-input"
              placeholder="메시지를 입력하세요..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
            />
            <button className="send-btn" onClick={handleSend}>
              <img src={sendIcon} alt="전송" />
            </button>
          </div>
          {modalType && (
            <CoinModal
              type={modalType}
              onConfirm={
                modalType === 'noCoin'
                  ? () => navigate('/shop')
                  : handleUseCoinConfirm
              }
              onCancel={() => setModalType(null)}
            />
          )}
        </>
      )}

      {imgModalSrc && (
        <ImageModal src={imgModalSrc} onClose={() => setImgModalSrc(null)} />
      )}
    </div>
  );
}
