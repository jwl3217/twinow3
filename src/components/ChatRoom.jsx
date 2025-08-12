// 경로: src/components/ChatRoom.jsx

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

const ADMIN_UID = 'E4d78bGGtnPMvPDl5DLdHx4oRa03';

// ===== E2EE helpers (최소 추가) =====
const KEYPAIR_STORAGE = 'e2ee:keypair:v1';

const ab2b64 = (buf) => {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
};
const b642ab = (b64) => {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
};

async function importPrivateJwk(jwk) {
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  );
}
async function importPublicJwk(jwk) {
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    []
  );
}
async function exportJwk(key) {
  return crypto.subtle.exportKey('jwk', key);
}

async function getOrCreateMyKeypair(uid) {
  const cached = localStorage.getItem(KEYPAIR_STORAGE);
  if (cached) {
    const { pub, priv } = JSON.parse(cached);
    return {
      publicKey: await importPublicJwk(pub),
      privateKey: await importPrivateJwk(priv),
      pubJwk: pub
    };
  }
  const keypair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  );
  const pubJwk  = await exportJwk(keypair.publicKey);
  const privJwk = await exportJwk(keypair.privateKey);
  localStorage.setItem(KEYPAIR_STORAGE, JSON.stringify({ pub: pubJwk, priv: privJwk }));
  try {
    const uref  = doc(db, 'users', uid);
    const usnap = await getDoc(uref);
    const cur   = usnap.data() || {};
    if (!cur.e2eePub) {
      await updateDoc(uref, { e2eePub: pubJwk }).catch(async () => {});
    }
  } catch {}
  return { publicKey: keypair.publicKey, privateKey: keypair.privateKey, pubJwk };
}

async function getOtherPublicKey(otherUid) {
  if (!otherUid) return null;
  const usnap = await getDoc(doc(db, 'users', otherUid));
  const data = usnap.data();
  if (!data || !data.e2eePub) return null;
  return importPublicJwk(data.e2eePub);
}

async function deriveAesKey(myPrivKey, otherPubKey) {
  return crypto.subtle.deriveKey(
    { name: 'ECDH', public: otherPubKey },
    myPrivKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptText(aesKey, plain) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder().encode(plain);
  const ct  = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, enc);
  return { iv: ab2b64(iv), ct: ab2b64(ct) };
}
async function decryptText(aesKey, ivB64, ctB64) {
  const iv = new Uint8Array(b642ab(ivB64));
  const ct = b642ab(ctB64);
  const buf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, ct);
  return new TextDecoder().decode(buf);
}
// ====================================

export default function ChatRoom() {
  const { roomId } = useParams();
  const navigate  = useNavigate();
  const me        = auth.currentUser?.uid;

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

  const [pinnedPost, setPinnedPost] = useState(undefined);
  const hasAnyMessageRef = useRef(false);
  const preventAutoDeleteRef = useRef(false);

  const aesKeyRef     = useRef(null);
  const e2eeReadyRef  = useRef(false);

  useEffect(() => {
    if (!me) return;
    getDoc(doc(db, 'users', me)).then(snap => {
      setBlockedUsers(snap.data()?.blockedUsers || []);
    });
  }, [me]);

  const prepareE2EE = async (myUid, peerUid) => {
    try {
      if (!myUid || !peerUid) {
        e2eeReadyRef.current = false;
        aesKeyRef.current = null;
        return;
      }
      const { privateKey } = await getOrCreateMyKeypair(myUid);
      const peerPub = await getOtherPublicKey(peerUid);
      if (!peerPub) {
        e2eeReadyRef.current = false;
        aesKeyRef.current = null;
        return;
      }
      const aesKey = await deriveAesKey(privateKey, peerPub);
      aesKeyRef.current = aesKey;
      e2eeReadyRef.current = true;
    } catch {
      e2eeReadyRef.current = false;
      aesKeyRef.current = null;
    }
  };

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
        await prepareE2EE(me, other);
      } else {
        setOtherUser({});
        e2eeReadyRef.current = false;
        aesKeyRef.current = null;
      }

      if (data.personaPostId) {
        const p = await getDoc(doc(db, 'posts', data.personaPostId));
        setPinnedPost(p.exists() ? { id: p.id, ...p.data() } : null);
      } else {
        setPinnedPost(undefined);
      }
    });

    const unsubM = onSnapshot(
      query(
        collection(db, 'chatRooms', roomId, 'messages'),
        orderBy('sentAt')
      ),
      async snap => {
        const listRaw = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const list = [];
        for (const m of listRaw) {
          if (m.cipher && e2eeReadyRef.current && aesKeyRef.current) {
            try {
              const plain = await decryptText(aesKeyRef.current, m.cipher.iv, m.cipher.ct);
              list.push({ ...m, text: plain });
            } catch {
              list.push({ ...m, text: '' });
            }
          } else {
            list.push(m);
          }
        }
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
  const isAdmin     = me === ADMIN_UID;

  const avatarSrc = personaMode
    ? (isAdmin
        ? (cannotSend ? defaultProfile : otherUser.photoURL || defaultProfile)
        : (room?.personaPhotoURL || defaultProfile))
    : (cannotSend ? defaultProfile : otherUser.photoURL || defaultProfile);

  const displayName = personaMode
    ? (isAdmin
        ? ((otherLeft || unknownDel) ? '알 수 없음' : otherUser.nickname)
        : (room?.personaNickname || '관리자'))
    : ((otherLeft || unknownDel) ? '알 수 없음' : otherUser.nickname);

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

    if (e2eeReadyRef.current && aesKeyRef.current) {
      try {
        const { iv, ct } = await encryptText(aesKeyRef.current, txt);
        await addDoc(collection(db, 'chatRooms', roomId, 'messages'), {
          cipher: { v: 1, iv, ct },
          sender: me,
          sentAt: serverTimestamp()
        });
        setInput('');
        const targetUid = personaMode ? (isAdmin ? otherUid : ADMIN_UID) : otherUid;
        await updateDoc(doc(db, 'chatRooms', roomId), {
          lastMessage: '',
          lastMessageCipher: { v: 1, iv, ct },
          lastAt: serverTimestamp(),
          ...(targetUid ? { [`unread.${targetUid}`]: increment(1) } : {})
        });
        return;
      } catch {}
    }

    await addDoc(collection(db, 'chatRooms', roomId, 'messages'), {
      text:   txt,
      sender: me,
      sentAt: serverTimestamp()
    });
    setInput('');
    const targetUid = personaMode ? (isAdmin ? otherUid : ADMIN_UID) : otherUid;
    await updateDoc(doc(db, 'chatRooms', roomId), {
      lastMessage: txt,
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
                        await updateDoc(doc(db, 'chatRooms', roomId), {
                          ghostHoldBy: me
                        });
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

        {messages.length === 0 && (
          <div style={{ textAlign: 'center', fontSize: 12, color: '#666', margin: '12px 0' }}>
            채팅 정보는 암호화되어 보관되며, 관리자가 확인할 수 없습니다.
          </div>
        )}

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
