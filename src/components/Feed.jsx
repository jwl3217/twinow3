// src/components/Feed.jsx

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
import searchIcon from '../assets/search-icon.png';

export default function Feed() {
  const navigate = useNavigate();
  const [posts, setPosts]                       = useState([]);
  const [users, setUsers]                       = useState({});
  const [selectedGender, setSelectedGender]     = useState('all');
  const [searchInput, setSearchInput]           = useState('');   // 변경: 입력용
  const [searchText, setSearchText]             = useState('');   // 변경: 실제 검색 기준
  const [modalSrc, setModalSrc]                 = useState(null);
  const [blockedUsers, setBlockedUsers]         = useState([]);
  const currentUid = auth.currentUser?.uid;

  // 1) 로그인 상태 확인
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      if (!user) navigate('/', { replace: true });
    });
    return unsub;
  }, [navigate]);

  // 2) 포스트 & 유저 로드
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

  // 3) 내 차단 목록
  useEffect(() => {
    if (!currentUid) return;
    (async () => {
      const meSnap = await getDoc(doc(db, 'users', currentUid));
      setBlockedUsers(meSnap.data()?.blockedUsers || []);
    })();
  }, [currentUid]);

  // 시간 표시 함수
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

  // 필터링 (searchText 기준)
  const filtered = posts.filter(post => {
    const u = users[post.uid] || {};
    if (selectedGender === 'male' && u.gender !== 'male')     return false;
    if (selectedGender === 'female' && u.gender !== 'female') return false;
    const txt = searchText.trim().toLowerCase();
    if (txt) {
      const a = (u.nickname  || '').toLowerCase().includes(txt);
      const b = (u.region    || '').toLowerCase().includes(txt);
      const c = (post.content|| '').toLowerCase().includes(txt);
      if (!a && !b && !c) return false;
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
          value={searchInput}                          // 변경
          onChange={e => setSearchInput(e.target.value)} // 변경
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
          const u         = users[post.uid] || {};
          const isBlocked = blockedUsers.includes(post.uid);
          const photo     = isBlocked
            ? defaultProfile
            : (u.photoURL || defaultProfile);
          const nick      = u.nickname || '알 수 없음';
          const content   = isBlocked
            ? '차단한 유저의 게시글입니다'
            : post.content;

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
                      {u.age || '--'}세 · {u.gender==='male'?'남자':'여자'} ·{' '}
                      {u.region || '--'} · {timeAgo(post.createdAt)}
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

      <div
        className="fab-button"
        onClick={() => navigate('/post/new')}
      >
        <img src={require('../assets/plus-icon.png')} alt="글쓰기" />
      </div>

      {modalSrc && (
        <ImageModal
          src={modalSrc}
          onClose={() => setModalSrc(null)}
        />
      )}
    </div>
  );
}
