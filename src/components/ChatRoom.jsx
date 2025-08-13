// src/components/ChatRoom.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate }            from 'react-router-dom';
import { auth, db }                          from '../firebaseConfig';
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
  increment,
  deleteDoc
} from 'firebase/firestore';
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

  // ★ 토큰 클레임 기반 admin 여부
  const [isAdminUser, setIsAdminUser] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const u = auth.currentUser;
        if (!u) return;
        const { claims } = await u.getIdTokenResult();
        setIsAdminUser(!!claims.admin);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    const bottomNav = document.querySelector('.bottom-nav');
    if (bottomNav) bottomNav.style.display = 'none';
    return () => { if (bottomNav) bottomNav.style.display = ''; };
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

  const [pinnedPost, setPinnedPost] = useState(undefined);
  const hasAnyMessageRef = useRef(false);
  const preventAutoDeleteRef = useRef(false);

  useEffect(() => {
    if (!me) return;
    getDoc(doc(db, 'users', me)).then(snap => {
      setBlockedUsers(snap.data()?.blockedUsers || []);
    });
  }, [me]);

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
    const unsubR = onSnapshot(roomRef, async snap => {
      if (!snap.exists()) {
        alert('채팅방이 없습니다.');
        navigate('/messages', { replace: true });
        return;
      }
      const data = snap.data();
      setRoom(data);

      const other = data.members?.find(u => u !== me) ?? null;
      setOtherUid(other);

      if (other) {
        const us = await getDoc(doc(db, 'users', other));
        setOtherUser(us.exists() ? us.data() : { deleted: true });
      } else {
        setOtherUser({});
      }

      if (data.personaPostId) {
        try {
          const p = await getDoc(doc(db, 'posts', data.personaPostId));
          setPinnedPost(p.exists() ? { id: p.id, ...p.data() } : null);
        } catch {
          setPinnedPost(null);
        }
      } else {
        setPinnedPost(undefined);
      }
    });

    const unsubM = onSnapshot(
      query(
        collection(db, 'chatRooms', roomId, 'messages'),
        orderBy('sentAt')
      ),
      snap => {
        const list = snap.docs.map(d => {
          const m = { id: d.id, ...d.data() };
          // ★ 폴백: 예전 암호화 메시지는 안내문으로 표시
          if (!m.text && m.cipher) m.text = '(오류로 인해 메세지를 볼 수 없습니다)';
          return m;
        });
        setMessages(list);
        hasAnyMessageRef.current = list.length > 0;
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }
    );

    return () => {
      unsubR();
      unsubM();
    };
  }, [navigate, roomId, me]);

  useEffect(() => {
    return () => {
      if (!roomId) return;
      if (hasAnyMessageRef.current) return;
      if (preventAutoDeleteRef.current) return;
      deleteDoc(doc(db, 'chatRooms', roomId)).catch(() => {});
    };
  }, [roomId]);

  const iBlockedThem  = blockedUsers.includes(otherUid);
  const theyBlockedMe = otherUser.blockedUsers?.includes(me);
  const otherLeft     = otherUid === null;
  const unknownDel    = otherUser.deleted;
  const cannotSend    = iBlockedThem || theyBlockedMe || otherLeft || unknownDel;

  const personaMode = room?.personaMode === true;

  // ★ 서버가 내려준 adminUid 우선, 없으면 안전 폴백
  const adminUid = room?.adminUid || null;
  const effectiveAdminUid =
    adminUid || (personaMode ? (isAdminUser ? me : otherUid) : null);

  const avatarSrc = personaMode
    ? (isAdminUser
        ? (cannotSend ? defaultProfile : otherUser.photoURL || defaultProfile)
        : (room?.personaPhotoURL || defaultProfile))
    : (cannotSend ? defaultProfile : otherUser.photoURL || defaultProfile);

  const displayName = personaMode
    ? (isAdminUser
        ? ((otherLeft || unknownDel) ? '알 수 없음' : otherUser.nickname)
        : (room?.personaNickname || '관리자'))
    : ((otherLeft || unknownDel) ? '알 수 없음' : otherUser.nickname);

  const formatRelativeTime = ts => {
    if (!ts?.toMillis) return '';
    const diff = Date.now() - ts.toMillis();
    const sec  = Math.floor(diff / 1000);
    if (sec < 60) return `0분 전`;
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

    // ★ 암호화 제거: 평문으로 저장
    await addDoc(collection(db, 'chatRooms', roomId, 'messages'), {
      text:   txt,
      sender: me,
      sentAt: serverTimestamp()
    });
    setInput('');

    const targetUid = personaMode ? (isAdminUser ? otherUid : effectiveAdminUid) : otherUid;
    await updateDoc(doc(db, 'chatRooms', roomId), {
      lastMessage: txt,              // ★ lastMessageCipher 제거
      lastAt:      serverTimestamp(),
      ...(targetUid ? { [`unread.${targetUid}`]: increment(1) } : {})
    });
  };

  const handleUseCoinConfirm = async () => {
    await updateDoc(doc(db, 'users', me), { coins: increment(-100) });
    await updateDoc(doc(db, 'chatRooms', roomId), { [`unlocked.${me}`]: true });
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

    if (!hasAnyMessageRef.current) {
      await deleteDoc(doc(db, 'chatRooms', roomId)).catch(() => {});
      navigate('/messages', { replace: true });
      return;
    }

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

  const isSupportChat =
    room?.isSupport === true ||
    (!!effectiveAdminUid && (room?.members || []).includes(effectiveAdminUid) && room?.personaMode !== true);

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
            <button onClick={handleReport}>신고</button>
          </div>
        )}
      </header>

      <div className="chatroom-messages">
        {room?.personaPostId && (
          <div className="pinned-post-card">
            {pinnedPost === undefined ? (
              <div className="pinned-loading">불러오는 중…</div>
            ) : pinnedPost === null ? (
              <div className="pinned-deleted">삭제된 게시글입니다</div>
            ) : (
              <>
                <div className="pinned-title">
                  {(room.personaTitle || '게시글')}
                </div>
                <button
                  className="pinned-goto-btn"
                  onClick={async () => {
                    preventAutoDeleteRef.current = true;
                    if (!hasAnyMessageRef.current && me) {
                      try {
                        await updateDoc(doc(db, 'chatRooms', roomId), { ghostHoldBy: me });
                      } catch {}
                    }
                    navigate(`/post/${room.personaPostId}`);
                  }}
                >
                  게시글로 이동
                </button>
              </>
            )}
          </div>
        )}

        {messages.length === 0 && isSupportChat && (
          <div style={{ textAlign: 'center', fontSize: 12, color: '#666', margin: '12px 0' }}>
            관리자와의 채팅이 시작되었습니다
          </div>
        )}

        {/* ★ 암호화 안내 문구 제거됨 */}

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
              className="chatroom-input"
              placeholder="메시지를 입력하세요..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              style={{ flex: 1 }}
            />
            <button className="send-btn" onClick={handleSend}>
              <img src={sendIcon} alt="전송" />
            </button>
          </div>
          {modalType && (
            <CoinModal
              type={modalType}
              onConfirm={modalType === 'noCoin' ? () => navigate('/shop') : handleUseCoinConfirm}
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
