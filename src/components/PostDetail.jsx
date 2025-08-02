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
      setPost(pSnap.data());
      const uSnap = await getDoc(doc(db, 'users', pSnap.data().uid));
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

  const isOwner       = me === post.uid;
  const iBlockedThem  = blockedUsers.includes(post.uid);
  const theyBlockedMe = writer.blockedUsers?.includes(me);
  const shouldMask    = iBlockedThem && !showHidden;

  const displayName  = writer.nickname;
  const displayPhoto = shouldMask
    ? defaultProfile
    : writer.photoURL || defaultProfile;

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

  const handleChat = async () => {
    if (iBlockedThem || theyBlockedMe) {
      alert('채팅을 할 수 없습니다');
      return;
    }
    const user = auth.currentUser;
    if (!user) {
      alert('로그인이 필요합니다.');
      return navigate('/', { replace: true });
    }
    const myUid    = user.uid;
    const otherUid = post.uid;
    const members  = [myUid, otherUid].sort();

    const roomsCol = collection(db, 'chatRooms');
    const q        = query(roomsCol, where('members', 'array-contains', myUid));
    const snap     = await getDocs(q);
    const exist    = snap.docs.find(d => d.data().members.includes(otherUid));
    if (exist) {
      return navigate(`/chat/${exist.id}`);
    }
    const newRef = doc(roomsCol);
    await setDoc(newRef, {
      members,
      lastMessage: '',
      lastAt:      serverTimestamp(),
      unlocked:    { [myUid]: false, [otherUid]: false },
      coins:       { [myUid]: 0,     [otherUid]: 0 }
    });
    navigate(`/chat/${newRef.id}`);
  };

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
                  {writer.age}세 · {writer.gender==='male'?'남자':'여자'} ·{' '}
                  {writer.region} · {timeAgo(post.createdAt)}
                </p>
              )}
            </div>

            {!isOwner && !iBlockedThem && !theyBlockedMe && (
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
                {isOwner ? (
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
