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

const ADMIN_UID = 'E4d78bGGtnPMvPDl5DLdHx4oRa03';

// ===== E2EE helpers (채팅방 미리보기 복호화용) =====
const KEYPAIR_STORAGE = 'e2ee:keypair:v1';
const ab2b64 = (buf) => { const bytes = new Uint8Array(buf); let bin=''; for (let i=0;i<bytes.length;i++) bin+=String.fromCharCode(bytes[i]); return btoa(bin); };
const b642ab = (b64) => { const bin=atob(b64); const bytes=new Uint8Array(bin.length); for (let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i); return bytes.buffer; };

async function importPrivateJwk(jwk){return crypto.subtle.importKey('jwk',jwk,{name:'ECDH',namedCurve:'P-256'},true,['deriveKey','deriveBits']);}
async function importPublicJwk(jwk){return crypto.subtle.importKey('jwk',jwk,{name:'ECDH',namedCurve:'P-256'},true,[]);}
async function exportJwk(key){return crypto.subtle.exportKey('jwk',key);}

async function getOrCreateMyKeypair(uid) {
  const cached = localStorage.getItem(KEYPAIR_STORAGE);
  if (cached) {
    const { pub, priv } = JSON.parse(cached);
    return { publicKey: await importPublicJwk(pub), privateKey: await importPrivateJwk(priv), pubJwk: pub };
  }
  const kp = await crypto.subtle.generateKey({ name:'ECDH', namedCurve:'P-256' }, true, ['deriveKey','deriveBits']);
  const pubJwk  = await exportJwk(kp.publicKey);
  const privJwk = await exportJwk(kp.privateKey);
  localStorage.setItem(KEYPAIR_STORAGE, JSON.stringify({ pub: pubJwk, priv: privJwk }));
  try {
    const uref = doc(db, 'users', uid);
    const us   = await getDoc(uref);
    if (!(us.data()||{}).e2eePub) {
      await updateDoc(uref, { e2eePub: pubJwk }).catch(()=>{});
    }
  } catch {}
  return { publicKey: kp.publicKey, privateKey: kp.privateKey, pubJwk };
}
async function getOtherPublicKey(otherUid){
  if (!otherUid) return null;
  const usnap = await getDoc(doc(db,'users',otherUid));
  const d = usnap.data();
  if (!d || !d.e2eePub) return null;
  return importPublicJwk(d.e2eePub);
}
async function deriveAesKey(myPriv, otherPub){
  return crypto.subtle.deriveKey(
    { name:'ECDH', public: otherPub },
    myPriv,
    { name:'AES-GCM', length:256 },
    false,
    ['decrypt','encrypt']
  );
}
async function decryptText(aesKey, ivB64, ctB64){
  const iv = new Uint8Array(b642ab(ivB64));
  const ct = b642ab(ctB64);
  const buf = await crypto.subtle.decrypt({ name:'AES-GCM', iv }, aesKey, ct);
  return new TextDecoder().decode(buf);
}
// ===============================================

export default function MessageList() {
  const navigate = useNavigate();
  const uid = auth.currentUser?.uid;

  const [rooms, setRooms] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [leaveId, setLeaveId] = useState(null);

  const isAdmin = uid === ADMIN_UID;

  useEffect(() => {
    if (!uid) return;
    getDoc(doc(db, 'users', uid)).then(snap => {
      setBlockedUsers(snap.data()?.blockedUsers || []);
    });
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    const qRooms = query(
      collection(db, 'chatRooms'),
      where('members', 'array-contains', uid)
    );
    const unsub = onSnapshot(qRooms, async snap => {
      const { privateKey } = await getOrCreateMyKeypair(uid); // 내 키 확보(없으면 생성)
      const fetched = await Promise.all(
        snap.docs.map(async d => {
          const room = { id: d.id, ...d.data() };
          const otherId = room.members.find(m => m !== uid) || null;

          const otherLeft = otherId === null;
          let userData = {};
          if (otherId) {
            const usSnap = await getDoc(doc(db, 'users', otherId));
            if (usSnap.exists()) userData = usSnap.data();
          }
          const unknownDel    = otherId && !userData.nickname;
          const iBlockedThem  = otherId ? blockedUsers.includes(otherId) : false;
          const theyBlockedMe = userData.blockedUsers?.includes(uid);
          const cannotSend = iBlockedThem || theyBlockedMe || otherLeft || unknownDel;

          const showOther = room.personaMode && isAdmin;

          const photoURL = showOther
            ? (cannotSend ? defaultProfile : (userData.photoURL || defaultProfile))
            : (room.personaMode
                ? (room.personaPhotoURL || defaultProfile)
                : (cannotSend ? defaultProfile : (userData.photoURL || defaultProfile)));

          const nickname = showOther
            ? ((otherLeft || unknownDel) ? '알 수 없음' : userData.nickname)
            : (room.personaMode
                ? (room.personaNickname || '관리자')
                : ((otherLeft || unknownDel) ? '알 수 없음' : userData.nickname));

          // ▼ 미리보기 복호화(가능할 때만)
          let displayLast = room.lastMessage || '';
          if (room.lastMessageCipher && otherId) {
            try {
              const otherPub = await getOtherPublicKey(otherId);
              if (otherPub) {
                const aesKey = await deriveAesKey(privateKey, otherPub);
                displayLast = await decryptText(aesKey, room.lastMessageCipher.iv, room.lastMessageCipher.ct);
              }
            } catch {}
          }

          return {
            id:          room.id,
            otherId,
            photoURL,
            nickname,
            lastMessage: displayLast,
            lastAt:      room.lastAt,
            unread:      room.unread?.[uid] || 0,
            category:    room.category || (room.personaMode ? 'persona' : 'direct'),
            personaMode: room.personaMode === true,
            personaPostId: room.personaPostId || null,
            // ✅ 추가: 고스트 보관자(게시글 이동으로 남긴 사람)
            ghostHoldBy: room.ghostHoldBy || null
          };
        })
      );

      // ✅ 필터링: 대화가 없는 방(lastAt 없음)은 ghostHoldBy가 나(uid)인 경우에만 노출
      const filtered = fetched.filter(r => {
        const hasActivity = !!(r.lastAt?.toMillis?.() && r.lastAt.toMillis() > 0);
        const isMineGhost = r.ghostHoldBy === uid;
        return hasActivity || isMineGhost;
      });

      filtered.sort((a, b) => (b.lastAt?.toMillis?.() || 0) - (a.lastAt?.toMillis?.() || 0));
      setRooms(filtered);
    });
    return () => unsub();
  }, [uid, blockedUsers, isAdmin]);

  const handleLeave = id => setLeaveId(id);

  const confirmLeave = async () => {
    if (!leaveId) return;
    await updateDoc(doc(db, 'chatRooms', leaveId), {
      members: arrayRemove(uid)
    });
    setLeaveId(null);
    setMenuOpenId(null);
  };

  const handleBlock = async (otherId) => {
    if (!otherId) return;
    if (!window.confirm('정말 차단하시겠습니까?')) return;
    await updateDoc(doc(db, 'users', uid), {
      blockedUsers: arrayUnion(otherId)
    });
    setBlockedUsers(prev => (prev.includes(otherId) ? prev : [...prev, otherId]));
    setMenuOpenId(null);
  };

  const handleUnblock = async (otherId) => {
    if (!otherId) return;
    if (!window.confirm('차단을 해제하시겠습니까?')) return;
    await updateDoc(doc(db, 'users', uid), {
      blockedUsers: arrayRemove(otherId)
    });
    setBlockedUsers(prev => prev.filter(x => x !== otherId));
    setMenuOpenId(null);
  };

  const RoomCard = (room) => {
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
          <img src={room.photoURL} alt="" className="room-profile" />
          <div className="room-text">
            <div className="room-header">
              <span className="room-nick">{room.nickname}</span>
              {/* 관리자 페르소나 방: 글보기 버튼 */}
              {uid === ADMIN_UID && room.personaMode && room.personaPostId && (
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/post/${room.personaPostId}`); }}
                  style={{
                    marginLeft: 8,
                    background: 'none',
                    border: 'none',
                    color: '#1da1f2',
                    fontSize: 12,
                    cursor: 'pointer'
                  }}
                >
                  글보기
                </button>
              )}
              {room.unread > 0 && (
                <span className="room-unread">
                  {room.unread > 9 ? '9+' : room.unread} 읽지않음
                </span>
              )}
            </div>
            <div className="room-last">{room.lastMessage || ''}</div>
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
            <button onClick={() => handleLeave(room.id)}>채팅방 나가기</button>
            {isBlockedByMe ? (
              <button onClick={() => handleUnblock(room.otherId)} disabled={!room.otherId}>
                차단 해제하기
              </button>
            ) : (
              <button onClick={() => handleBlock(room.otherId)} disabled={!room.otherId}>
                차단하기
              </button>
            )}
            <button onClick={() => navigate(`/report/${room.otherId}`)}>신고</button>
          </div>
        )}
      </div>
    );
  };

  const personaRooms = rooms.filter(r => r.category === 'persona' || r.personaMode);
  const supportRooms = rooms.filter(r => !(r.category === 'persona' || r.personaMode));
  const canSplit = isAdmin;

  return (
    <div className="msglist-container">
      <header className="msglist-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <img src={backArrow} alt="뒤루가기" className="back-btn-icon" />
        </button>
        <span className="header-title">메시지 목록</span>
      </header>

      <div className="msglist-separator" />

      <div className="msglist-body">
        {!canSplit ? (
          rooms.map(RoomCard)
        ) : (
          <div className="msglist-two-cols">
            <div className="msglist-col">
              <div className="msglist-col-title">문의하기</div>
              {supportRooms.map(RoomCard)}
            </div>
            <div className="msglist-col">
              <div className="msglist-col-title">페르소나</div>
              {personaRooms.map(RoomCard)}
            </div>
          </div>
        )}
      </div>

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
