// 경로: src/components/PostCreate.jsx

import React, { useState } from 'react';
import { useNavigate }               from 'react-router-dom';
import { auth, db }                  from '../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import backArrow                      from '../assets/back-arrow.png';
import '../styles/PostCreate.css';

export default function PostCreate() {
  const navigate = useNavigate();
  const [content, setContent] = useState('');

  const handleCancel = () => navigate(-1);

  const handleSubmit = async () => {
    if (!content.trim()) {
      alert('내용을 입력해 주세요.');
      return;
    }
    try {
      await addDoc(collection(db, 'posts'), {
        uid:       auth.currentUser.uid,
        photoURL:  auth.currentUser.photoURL || '',
        nickname:  auth.currentUser.displayName || '',
        gender:    '',
        age:       null,
        region:    '',
        content:   content.trim(),
        createdAt: serverTimestamp()
      });
      navigate('/feed');
    } catch {
      alert('게시글 등록 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="create-container">
      {/* 1) 고정 헤더 */}
      <header className="create-header">
        <button className="back-button" onClick={handleCancel}>
          <img src={backArrow} alt="뒤로가기" />
        </button>
        <span className="header-title">글쓰기</span>
      </header>

      {/* 2) 헤더 밑 분리선 */}
      <div className="create-separator" />

      {/* 3) 본문 스크롤 영역 */}
      <div className="create-body">
        {/* 4) 카드 안에 textarea */}
        <div className="create-card">
          <textarea
            className="create-textarea"
            placeholder="무슨 생각을 나누고 싶으신가요?"
            value={content}
            onChange={e => setContent(e.target.value)}
          />
        </div>
        <button className="submit-button" onClick={handleSubmit}>
          등록
        </button>
      </div>
    </div>
  );
}
