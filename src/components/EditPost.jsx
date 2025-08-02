// 경로: src/components/EditPost.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate }     from 'react-router-dom';
import { db }                         from '../firebaseConfig';
import { doc, getDoc, updateDoc }     from 'firebase/firestore';
import defaultProfile                 from '../assets/default-profile.png';
import backArrow                      from '../assets/back-arrow.png';
import '../styles/EditPost.css';

export default function EditPost() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState('');

  useEffect(() => {
    getDoc(doc(db, 'posts', id))
      .then(docSnap => {
        if (docSnap.exists()) {
          setContent(docSnap.data().content);
        } else {
          alert('글을 찾을 수 없습니다.');
          navigate(-1);
        }
      })
      .catch(() => {
        alert('글 불러오기 실패');
        navigate(-1);
      });
  }, [id, navigate]);

  const handleCancel = () => navigate(-1);

  const handleSave = async () => {
    if (!content.trim()) {
      return alert('내용을 입력해 주세요.');
    }
    try {
      await updateDoc(doc(db, 'posts', id), {
        content: content.trim()
      });
      navigate(`/post/${id}`);
    } catch {
      alert('글 수정 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="edit-container">
      {/* 1) PostDetail과 똑같은 헤더 */}
      <header className="edit-header">
        <button className="back-button" onClick={handleCancel}>
          <img src={backArrow} alt="뒤로가기" />
        </button>
        <span className="header-title">글 수정</span>
      </header>

      {/* 2) 헤더 아래 분리선 */}
      <div className="edit-separator" />

      {/* 3) 헤더 & 분리선 아래부터 BottomNav 위까지 스크롤 */}
      <div className="edit-body">
        {/* 4) 카드 디자인 */}
        <div className="edit-card">
          <textarea
            className="edit-textarea"
            value={content}
            onChange={e => setContent(e.target.value)}
          />
        </div>
        <button className="save-button" onClick={handleSave}>
          수정완료
        </button>
      </div>
    </div>
  );
}
