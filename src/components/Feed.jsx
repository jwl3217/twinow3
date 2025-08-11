// 경로: src/components/Feed.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate }                from 'react-router-dom';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  getDoc
} from 'firebase/firestore';
import { auth, db }                   from '../firebaseConfig';
import { onAuthStateChanged }         from 'firebase/auth';
import defaultProfile                 from '../assets/default-profile.png';
import ImageModal                     from './ImageModal';
import '../styles/feed.css';
import searchIcon                     from '../assets/search-icon.png';
import scrollTopIcon                  from '../assets/scroll-top.png';

export default function Feed() {
  const navigate = useNavigate();
  const [posts, setPosts]                       = useState([]);
  const [users, setUsers]                       = useState({});
  const [selectedGender, setSelectedGender]     = useState('all');
  const [searchInput, setSearchInput]           = useState('');
  const [searchText, setSearchText]             = useState('');
  const [modalSrc, setModalSrc]                 = useState(null);
  const [blockedUsers, setBlockedUsers]         = useState([]);
  const [showTop, setShowTop]                   = useState(false);
  const currentUid = auth.currentUser?.uid;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      if (!user) navigate('/', { replace: true });
    });
    return unsub;
  }, [navigate]);

  useEffect(() => {
    const qPosts = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(qPosts, async snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPosts(data);
      const uids = [...new Set(data.map(p => p.uid))];
      const toFetch = uids.filter(uid => !users[uid]);
      const fetched = await Promise.all(
        toFetch.map(async uid => {
          const s = await getDoc(doc(db, 'users', uid));
          return s.exists() ? { uid, data: s.data() } : null;
        })
      );
      const nu = {};
      fetched.forEach(i => i && (nu[i.uid] = i.data));
      if (Object.keys(nu).length) setUsers(prev => ({ ...prev, ...nu }));
    });
    return () => unsub();
  }, [users]);

  useEffect(() => {
    if (!currentUid) return;
    (async () => {
      const meSnap = await getDoc(doc(db, 'users', currentUid));
      setBlockedUsers(meSnap.data()?.blockedUsers || []);
    })();
  }, [currentUid]);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || document.documentElement.scrollTop;
      setShowTop(y > window.innerHeight);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = () => {
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      window.scrollTo(0, 0);
    }
  };

  const timeAgo = ts => {
    if (!ts?.toMillis) return '';
    const diff = Date.now() - ts.toMillis();
    const sec  = Math.floor(diff / 1000);
    if (sec < 60) return `${sec}초 전`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}분 전`;
    const hr  = Math.floor(min / 60);
    if (hr < 24) return `${hr}시간 전`;
    const day = Math.floor(hr / 24);
    if (day < 365) return `${day}일 전`;
    return `${Math.floor(day / 365)}년 전`;
  };

  // 필터링: 페르소나 모드면 post의 필드 사용
  const filtered = posts.filter(post => {
    const isPersona = post.personaMode === true;
    const u = users[post.uid] || {};

    const g = isPersona ? post.gender : u.gender;
    if (selectedGender === 'male' && g !== 'male') return false;
    if (selectedGender === 'female' && g !== 'female') return false;

    const txt = searchText.trim().toLowerCase();
    if (txt) {
      const nick   = (isPersona ? (post.nickname || '') : (u.nickname || '')).toLowerCase();
      const region = (isPersona ? (post.region   || '') : (u.region   || '')).toLowerCase();
      const body   = (post.content || '').toLowerCase();
      if (!nick.includes(txt) && !region.includes(txt) && !body.includes(txt)) return false;
    }
    return true;
  });

  return (
    <div className="feed-container">
      <div className="feed-header">
        <select
          value={selectedGender}
          onChange={e => setSelectedGender(e.target.value)}
        >
          <option value="all">전체글</option>
          <option value="male">남자만 보기</option>
          <option value="female">여자만 보기</option>
        </select>
        <input
          type="text"
          placeholder="지역, 닉네임, 글 내용 검색"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
        />
        <button
          type="button"
          onClick={() => setSearchText(searchInput)}
          className="search-button"
        >
          <img src={searchIcon} alt="검색" />
        </button>
      </div>

      <div className="post-list">
        {filtered.map(post => {
          const isPersona = post.personaMode === true;
          const u         = users[post.uid] || {};
          const isBlocked = blockedUsers.includes(post.uid);

          const photo = isBlocked
            ? defaultProfile
            : (isPersona
                ? (post.photoURL || defaultProfile)
                : (u.photoURL || defaultProfile));

          const nick = isPersona
            ? (post.nickname || '알 수 없음')
            : (u.nickname || '알 수 없음');

          const gender = isPersona ? post.gender : u.gender;
          const age    = isPersona ? post.age    : u.age;
          const region = isPersona ? post.region : u.region;

          const content = isBlocked ? '차단한 유저의 게시글입니다' : post.content;

          return (
            <div
              key={post.id}
              className="post-card"
              onClick={() => navigate(`/post/${post.id}`)}
              style={{ cursor: 'pointer' }}
            >
              <div className="post-header">
                <img
                  src={photo}
                  alt="프로필"
                  className="post-profile"
                  style={{ cursor: isBlocked ? 'default' : 'pointer' }}
                  onClick={e => {
                    e.stopPropagation();
                    if (!isBlocked) setModalSrc(photo);
                  }}
                />
                <div className="post-userinfo">
                  <h3>{nick}</h3>
                  {!isBlocked && (
                    <p>
                      {(age ?? '--')}세 · {gender==='male'?'남자':(gender==='female'?'여자':'--')} · {region || '--'} · {timeAgo(post.createdAt)}
                    </p>
                  )}
                </div>
              </div>
              <div className="post-content">{content}</div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="no-posts">조건에 맞는 글이 없습니다.</p>
        )}
      </div>

      {/* 글쓰기 FAB */}
      <div
        className="fab-button"
        onClick={() => navigate('/post/new')}
      >
        <img src={require('../assets/plus-icon.png')} alt="글쓰기" />
      </div>

      {/* ▲ 맨 위로 버튼 */}
      <button
        type="button"
        className={`scroll-top ${showTop ? 'visible' : ''}`}
        onClick={scrollToTop}
        aria-label="맨 위로 이동"
      >
        <img src={scrollTopIcon} alt="" loading="lazy" />
      </button>

      {modalSrc && (
        <ImageModal
          src={modalSrc}
          onClose={() => setModalSrc(null)}
        />
      )}
    </div>
  );
}
