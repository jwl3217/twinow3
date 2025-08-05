// 경로: src/components/Report.jsx

import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { auth, db } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import backArrow from '../assets/back-arrow.png';
import '../styles/Report.css';

export default function Report() {
  const { id: reportedUid } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [type, setType] = useState('');        // 신고 유형 상태 추가
  const [text, setText] = useState('');

  const handleSubmit = async () => {
    if (!type) {
      alert('신고 유형을 선택해 주세요.');
      return;
    }
    if (!text.trim()) {
      alert('신고하실 내용을 입력해 주세요.');
      return;
    }
    try {
      await addDoc(collection(db, 'reports'), {
        reporterUid: auth.currentUser.uid,
        reportedUid,
        type,                                // DB에 유형 저장
        text: text.trim(),
        route: location.pathname,
        createdAt: serverTimestamp()
      });
      alert('신고가 접수되었습니다.');
      navigate(-1);
    } catch (err) {
      console.error('신고 전송 실패:', err);
      alert('신고 전송 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="report-container">
      <header className="report-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <img src={backArrow} alt="뒤로가기" className="back-btn-icon" />
        </button>
        <span className="header-title">신고하기</span>
      </header>
      <div className="report-separator" />
      <div className="report-body">
        <select
          className="report-select"
          value={type}
          onChange={e => setType(e.target.value)}
        >
          <option value="">신고 유형 선택</option>
          <option value="상업적 게시글">상업적 게시글</option>
          <option value="도박/사행성">도박/사행성</option>
          <option value="기타">기타</option>
        </select>
        <textarea
          className="report-textarea"
          placeholder="신고하실 내용을 입력해 주세요"
          value={text}
          onChange={e => setText(e.target.value)}
        />
        <button
          className="report-button"
          onClick={handleSubmit}
          disabled={!type || !text.trim()}
        >
          신고하기
        </button>
      </div>
    </div>
  );
}
