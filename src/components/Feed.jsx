// 경로: src/components/Feed.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate }                from 'react-router-dom';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  limit as fsLimit,
} from 'firebase/firestore';
import { auth, db }                   from '../firebaseConfig';
import { onAuthStateChanged }         from 'firebase/auth';
import defaultProfile                 from '../assets/default-profile.png';
import ImageModal                     from './ImageModal';
import '../styles/feed.css';
import searchIcon                     from '../assets/search-icon.png';
import scrollTopIcon                  from '../assets/scroll-top.png';

// ====== ▼ 로드 튜닝 파라미터 (여기만 바꾸면 됨) ▼ ======
const ITEM_APPROX_HEIGHT   = 160; // 카드 대략 높이(px)
const INITIAL_MULTIPLIER   = 3;   // 초기: 한 화면 개수 * 3배
const LOAD_MULTIPLIER      = 2;   // 추가: 한 화면 개수 * 2배
const IO_ROOT_MARGIN       = '0px 0px 400px 0px'; // 바닥 근접 감지 여유
// ====== ▲ 로드 튜닝 파라미터 ▲ ======

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

  // 한 화면에 들어갈 대략 개수
  const baseCountRef = useRef(
    Math.max(10, Math.ceil(window.innerHeight / ITEM_APPROX_HEIGHT))
  );
  // ★ 현재 로드 제한 수 (여기만 늘려가며 같은 쿼리를 재구독)
  const [limitCount, setLimitCount] = useState(baseCountRef.current * INITIAL_MULTIPLIER);

  const sentinelRef   = useRef(null);   // 무한스크롤 감지용 센티널
  const ioRef         = useRef(null);   // IntersectionObserver 인스턴스
  const bumpingRef    = useRef(false);  // 과도 증가 방지
  const allLoadedRef  = useRef(false);  // 더 가져올 게 없는 경우
  const mountedRef    = useRef(false);  // 초기화 제어

  // 로그인 체크
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      if (!user) navigate('/', { replace: true });
    });
    return unsub;
  }, [navigate]);

  // ★ 피드 진입 시(마운트) 확실히 초기화 (요청사항)
  useEffect(() => {
    mountedRef.current = true;
    setLimitCount(baseCountRef.current * INITIAL_MULTIPLIER);
    setPosts([]);
    allLoadedRef.current = false;
    return () => { mountedRef.current = false; };
  }, []);

  // ★ posts 구독: limitCount 바뀔 때마다 재구독
  useEffect(() => {
    const qPosts = query(
      collection(db, 'posts'),
      orderBy('createdAt', 'desc'),
      fsLimit(limitCount)
    );

    const unsub = onSnapshot(qPosts, async snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPosts(data);

      // 전부 다 가져온 경우 표시 (더 이상 bump 안 하도록 메모)
      if (data.length < limitCount) {
        allLoadedRef.current = true;
      } else {
        allLoadedRef.current = false;
      }

      // 작성자 유저 정보 보강
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
  
  }, [limitCount]);

  // 차단 목록
  useEffect(() => {
    if (!currentUid) return;
    (async () => {
      const meSnap = await getDoc(doc(db, 'users', currentUid));
      setBlockedUsers(meSnap.data()?.blockedUsers || []);
    })();
  }, [currentUid]);

  // 상단 버튼 노출 (window 스크롤 기준은 그대로 유지)
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || document.documentElement.scrollTop;
      setShowTop(y > window.innerHeight);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ★ IntersectionObserver 로 바닥 근접 감지 → limitCount 증가
  useEffect(() => {
    const rootEl =
      document.querySelector('.feed-container') || null; // 스크롤 컨테이너일 수도 있음

    if (!sentinelRef.current) return;

    // 기존 옵저버 해제
    if (ioRef.current) {
      try { ioRef.current.disconnect(); } catch {}
    }

    ioRef.current = new IntersectionObserver(
      entries => {
        const ent = entries[0];
        if (!ent || !ent.isIntersecting) return;
        if (bumpingRef.current) return;
        if (allLoadedRef.current) return; // 더 가져올 게 없으면 중단

        bumpingRef.current = true;
        const add = baseCountRef.current * LOAD_MULTIPLIER; // ← 추가 로드 수 (조절 지점)
        setLimitCount(prev => prev + add);

        // 짧게 쓰로틀
        setTimeout(() => { bumpingRef.current = false; }, 400);
      },
      {
        root: rootEl,        // 스크롤 컨테이너가 있으면 그걸 루트로
        rootMargin: IO_ROOT_MARGIN, // 바닥 400px 남았을 때 미리 당겨 로드
        threshold: 0.01,
      }
    );

    ioRef.current.observe(sentinelRef.current);

    return () => {
      if (ioRef.current) {
        try { ioRef.current.disconnect(); } catch {}
      }
    };
  }, [sentinelRef]);

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

        {/* ★ 무한스크롤 센티널: 이 엘리먼트가 보이면 추가 로드 */}
        <div ref={sentinelRef} style={{ height: 1 }} />
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
