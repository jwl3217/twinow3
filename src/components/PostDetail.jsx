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

  // ====== 표시용 필드(페르소나 표식 없이 동작) ======
  const iBlockedThem  = blockedUsers.includes(post.uid);
  const theyBlockedMe = writer.blockedUsers?.includes(me);
  const shouldMask    = iBlockedThem && !showHidden;

  const displayName  = writer.nickname || '알 수 없음';
  const displayPhoto = shouldMask ? defaultProfile : (writer.photoURL || defaultProfile);

  const dispAge    = writer.age;
  const dispGender = writer.gender;
  const dispRegion = writer.region;

  const timeAgo = ts => {
    if (!ts?.toMillis) return '';
    const diff = Date.now() - ts.toMillis();
    const sec  = Math.floor(diff / 1000);
    if (sec < 60) return '방금';
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

  // ====== 서버 위임: 방 개설(일반/페르소나 모두) ======
  const OPEN_CHAT_URLS = [
    // 새 이름(권장)
    'https://us-central1-twinow3-app.cloudfunctions.net/openChat',
    // 구 이름(배포 과도기 호환)
    'https://us-central1-twinow3-app.cloudfunctions.net/openPersonaChat'
  ];

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

    try {
      const token = await user.getIdToken();
      let roomId = null;
      let lastErr = null;

      for (const url of OPEN_CHAT_URLS) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              postId: id
              // 서버가 postId를 기준으로 상대 UID, 카테고리, 인덱스 생성, participants 생성 등을 모두 처리
            })
          });
          if (!res.ok) {
            lastErr = new Error(`${res.status} ${res.statusText}`);
            continue;
          }
          const data = await res.json();
          if (data?.ok && data?.roomId) {
            roomId = data.roomId;
            break;
          }
          lastErr = new Error(data?.message || 'unknown_error');
        } catch (e) {
          lastErr = e;
        }
      }

      if (!roomId) {
        console.error('openChat error:', lastErr);
        alert('채팅방을 여는 중 오류가 발생했습니다.');
        return;
      }
      navigate(`/chat/${roomId}`);
    } catch (e) {
      console.error('openChat unexpected error:', e);
      alert('채팅방을 여는 중 오류가 발생했습니다.');
    }
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

            {/* 차단상태만 제외하고 항상 노출 */}
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
