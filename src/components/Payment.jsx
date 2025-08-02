// 경로: src/components/Payment.jsx

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import backArrow from '../assets/back-arrow.png';
import '../styles/Payment.css';

export default function Payment() {
  const { amount } = useParams();
  const navigate = useNavigate();

  // 구매 페이지와 동일한 mapping
  const priceMap = {
    '10000': '4700원(강추)',
    '20000': '12000원',
    '30000': '20000원',
    '50000': '35000원'
  };
  const price = priceMap[amount] ?? `${(amount * 0.1).toLocaleString()}원`;

  return (
    <div className="payment-container">
      {/* 고정 헤더 */}
      <header className="detail-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <img src={backArrow} alt="뒤로가기" />
        </button>
        <span className="header-title">결제하기</span>
      </header>

      {/* 헤더 아래 분리선 */}
      <div className="detail-separator" />

      {/* 스크롤 가능한 본문 */}
      <div className="detail-body">
        <div className="payment-info">
          <p>코인 {amount.toLocaleString()}개 구매</p>
          <p>총 결제 금액: {price}</p>
        </div>
        <button
          className="pay-button"
          onClick={() => alert('PG사 결제 페이지로 이동합니다.')}
        >
          결제하기
        </button>
      </div>
    </div>
  );
}
