// 경로: src/components/PostDetail.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate }      from 'react-router-dom';
import { auth, db }                    from '../firebaseConfig';
import {
  doc,
  getDoc,
  deleteDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  query,
  collection,
  where,
  getDocs,
  setDoc
} from 'firebase/firestore';
import defaultProfile      from '../assets/default-profile.png';
import backArrow           from '../assets/back-arrow.png';
import dotsIcon            from '../assets/three-dots-icon.png';
import hiddenIcon          from '../assets/eye-hidden.png';
import visibleIcon         from '../assets/eye-visible.png';
import ImageModal          from './ImageModal';
import '../styles/PostDetail.css';
import '../styles/feed.css';

const ADMIN_UID = 'E4d78bGGtnPMvPDl5DLdHx4oRa03'; // ★ 관리자 UID

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const me = auth.currentUser?.uid;

  const [post, setPost] = useState(null);
  const [writer, setWriter] = useState(null);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [modalSrc, setModalSrc] = useState(null);

  // 1) 게시글+작성자 로드
  useEffect(() => {
    (async () => {
      const pSnap = await getDoc(doc(db, 'posts', id));
      if (!pSnap.exists()) {
        alert('게시글을 찾을 수 없습니다.');
        return navigate('/feed', { replace: true });
      }
      const pData = pSnap.data();
      setPost(pData);
      const uSnap = await getDoc(doc(db, 'users', pData.uid));
      setWriter(uSnap.exists() ? uSnap.data() : {});
    })();
  }, [id, navigate]);

  // 2) 내 차단 목록 로드
  useEffect(() => {
    if (!me) return;
    getDoc(doc(db, 'users', me)).then(snap => {
      setBlockedUsers(snap.data()?.blockedUsers || []);
    });
  }, [me]);

  if (!post || !writer) return null;

  // ====== 페르소나 모드일 때는 post의 필드 우선 사용 ======
  const usePersona = post.personaMode === true;

  const iBlockedThem  = blockedUsers.includes(post.uid);
  const theyBlockedMe = writer.blockedUsers?.includes(me);
  const shouldMask    = iBlockedThem && !showHidden;

  const displayName  = usePersona ? (post.nickname || '알 수 없음') : writer.nickname;
  const displayPhoto = shouldMask
    ? defaultProfile
    : (usePersona ? (post.photoURL || defaultProfile) : (writer.photoURL || defaultProfile));

  const dispAge    = usePersona ? post.age    : writer.age;
  const dispGender = usePersona ? post.gender : writer.gender;
  const dispRegion = usePersona ? post.region : writer.region;

  const timeAgo = ts => {
    if (!ts?.toMillis) return '';
    const diff = Date.now() - ts.toMillis();
    const sec  = Math.floor(diff / 1000);
    if (sec < 60) return `${sec}초 전`;
    const min  = Math.floor(sec / 60);
    if (min < 60) return `${min}분 전`;
    const hr   = Math.floor(min / 60);
    if (hr < 24) return `${hr}시간 전`;
    const day  = Math.floor(hr / 24);
    if (day < 365) return `${day}일 전`;
    return `${Math.floor(day / 365)}년 전`;
  };

  const handleDelete = async () => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    await deleteDoc(doc(db, 'posts', id));
    navigate('/feed', { replace: true });
  };

  const handleBlock = async () => {
    if (!window.confirm('정말 차단하시겠습니까?')) return;
    await updateDoc(doc(db, 'users', me), {
      blockedUsers: arrayUnion(post.uid)
    });
    setBlockedUsers(prev => [...prev, post.uid]);
    setMenuOpen(false);
  };

  const handleUnblock = async () => {
    if (!window.confirm('차단을 해제하시겠습니까?')) return;
    await updateDoc(doc(db, 'users', me), {
      blockedUsers: arrayRemove(post.uid)
    });
    setBlockedUsers(prev => prev.filter(u => u !== post.uid));
    setShowHidden(false);
    setMenuOpen(false);
  };

  // ★ 제목/요약 유틸(채팅방 상단 카드용)
  const deriveTitle = (text = '') => {
    const oneline = String(text).split('\n')[0].trim();
    return oneline.length > 20 ? oneline.slice(0, 20) + '…' : oneline || '게시글';
  };
  const deriveExcerpt = (text = '') => {
    const one = text.replace(/\s+/g, ' ').trim();
    const limit = 60;
    return one.length > limit ? one.slice(0, limit) + ' …더보기' : one;
  };

  // ★ 글 기준 채팅방 생성/접속
  const handleChat = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert('로그인이 필요합니다.');
      return navigate('/', { replace: true });
    }
    if (iBlockedThem || theyBlockedMe) {
      alert('채팅을 할 수 없습니다');
      return;
    }

    const myUid = user.uid;

    if (post.personaMode === true) {
      // ① 내 uid + 이 게시글(personaPostId)로 만든 방 재사용
      const roomsCol = collection(db, 'chatRooms');
      const qRooms   = query(
        roomsCol,
        where('members', 'array-contains', myUid),
        where('personaPostId', '==', id)
      );
      const existSnap = await getDocs(qRooms);
      if (!existSnap.empty) {
        return navigate(`/chat/${existSnap.docs[0].id}`);
      }

      // ② 없으면 생성 (멤버: 나 + 관리자)
      const newRef = doc(roomsCol);
      await setDoc(newRef, {
        members: [myUid, ADMIN_UID].sort(),
        lastMessage: '',
        lastAt:      serverTimestamp(),
        unlocked:    { [myUid]: false, [ADMIN_UID]: false },
        coins:       { [myUid]: 0,     [ADMIN_UID]: 0 },

        // 페르소나 전용 메타
        personaMode:     true,
        personaPostId:   id,
        personaNickname: post.nickname || '관리자',
        personaPhotoURL: post.photoURL || '',
        personaTitle:    deriveTitle(post.content || ''),
        personaExcerpt:  deriveExcerpt(post.content || '')
      });
      return navigate(`/chat/${newRef.id}`);
    }

    // (일반 글) 기존 1:1 방 있으면 재사용 + 카드 메타 업sert
    const otherUid2 = post.uid;
    const members2  = [myUid, otherUid2].sort();

    const roomsCol2 = collection(db, 'chatRooms');
    const q2        = query(roomsCol2, where('members', 'array-contains', myUid));
    const snap2     = await getDocs(q2);
    const exist2    = snap2.docs.find(d => d.data().members.includes(otherUid2));

    if (exist2) {
      // ★ 기존 방에 카드 메타만 주입 (상단 카드 1개 노출용)
      const exRef = doc(roomsCol2, exist2.id);
      await updateDoc(exRef, {
        personaPostId: id,
        personaTitle:  deriveTitle(post.content || '')
        // (excerpt는 ChatRoom에서 사용하지 않으니 생략)
      }).catch(() => {});
      return navigate(`/chat/${exist2.id}`);
    }

    // ★ 새 방 생성 시에도 카드 메타 포함
    const newRef2 = doc(roomsCol2);
    await setDoc(newRef2, {
      members: members2,
      lastMessage: '',
      lastAt:      serverTimestamp(),
      unlocked:    { [myUid]: false, [otherUid2]: false },
      coins:       { [myUid]: 0,     [otherUid2]: 0 },

      // 카드 메타(일반 글)
      personaPostId: id,
      personaTitle:  deriveTitle(post.content || '')
    });
    navigate(`/chat/${newRef2.id}`);
  };

  const genderLabel =
    dispGender === 'male' ? '남자' :
    dispGender === 'female' ? '여자' : '--';

  return (
    <div className="post-detail-container">
      <header className="detail-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <img src={backArrow} alt="뒤로가기" />
        </button>
        <span className="header-title">{displayName}님의 글</span>
      </header>

      <div className="detail-separator" />

      <div className="detail-body">
        <div className="post-card detail-card">
          <div className="post-header">
            <img
              src={displayPhoto}
              alt="프로필"
              className="post-profile"
              style={{ cursor: shouldMask ? 'default' : 'pointer' }}
              onClick={() => !shouldMask && setModalSrc(displayPhoto)}
            />
            <div className="post-userinfo">
              <h3>{displayName}</h3>
              {!shouldMask && (
                <p>
                  {(dispAge ?? '--')}세 · {genderLabel} · {dispRegion || '--'} · {timeAgo(post.createdAt)}
                </p>
              )}
            </div>

            {/* 차단상태만 제외하고 항상 노출 (관리자 페르소나/일반 모두 지원) */}
            {!(iBlockedThem || theyBlockedMe) && (
              <button className="chat-button" onClick={handleChat}>
                1:1 채팅
              </button>
            )}

            <button
              className="detail-dots-button"
              onClick={() => setMenuOpen(o => !o)}
            >
              <img src={dotsIcon} alt="더보기" />
            </button>
            {menuOpen && (
              <div className="menu-dropdown">
                {me === post.uid ? (
                  <>
                    <button onClick={() => navigate(`/post/${id}/edit`)}>수정</button>
                    <button onClick={handleDelete}>삭제</button>
                  </>
                ) : iBlockedThem ? (
                  <button onClick={handleUnblock}>차단 해제</button>
                ) : (
                  <>
                    <button onClick={() => navigate(`/report/${post.uid}`)}>신고</button>
                    <button onClick={handleBlock}>차단</button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="post-content">
            {iBlockedThem && !showHidden ? (
              <>
                <img
                  src={hiddenIcon}
                  alt="숨김"
                  style={{
                    cursor:'pointer',
                    marginRight:4,
                    width:'1.1em',height:'1.1em',
                    verticalAlign:'text-bottom'
                  }}
                  onClick={() => setShowHidden(true)}
                />
                차단한 유저의 게시글입니다
              </>
            ) : iBlockedThem && showHidden ? (
              <>
                <img
                  src={visibleIcon}
                  alt="보임"
                  style={{
                    cursor:'pointer',
                    marginRight:4,
                    width:'1.1em',height:'1.1em',
                    verticalAlign:'text-bottom'
                  }}
                  onClick={() => setShowHidden(false)}
                />
                {post.content}
              </>
            ) : (
              post.content
            )}
          </div>
        </div>
      </div>

      {modalSrc && (
        <ImageModal src={modalSrc} onClose={() => setModalSrc(null)} />
      )}
    </div>
  );
}
