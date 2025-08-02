// 경로: src/components/Shop.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import coinImg from '../assets/coin.png';
import backArrow from '../assets/back-arrow.png';
import '../styles/Shop.css';

export default function Shop() {
  const navigate = useNavigate();
  const options = [
    { coins: 10000, price: '4700원(강추)' },
    { coins: 20000, price: '12000원' },
    { coins: 30000, price: '20000원' },
    { coins: 50000, price: '35000원' }
  ];
  const [selAmount, setSelAmount] = useState(null);

  return (
    <div className="shop-container">
      {/* 1) 고정 헤더 */}
      <header className="shop-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <img src={backArrow} alt="뒤로가기" />
        </button>
        <span className="header-title">코인 구매</span>
      </header>

      {/* 2) 분리선 */}
      <div className="shop-separator" />

      {/* 3) 본문 스크롤 영역 */}
      <div className="shop-body">
        {options.map(({ coins, price }) => (
          <div key={coins} className="shop-card">
            <div className="shop-card-info">
              <img src={coinImg} alt="coin" className="shop-card-img" />
              <div className="shop-card-text">
                <p className="shop-card-coins">{coins.toLocaleString()}개</p>
                <p className="shop-card-price">{price}</p>
              </div>
            </div>
            <button className="shop-card-btn" onClick={() => setSelAmount(coins)}>
              구매하기
            </button>
          </div>
        ))}

        {selAmount !== null && (
          <>
            <div className="modal-overlay" />
            <div className="confirm-modal">
              <p>코인 {selAmount.toLocaleString()}개를 구매하시겠습니까?</p>
              <div className="confirm-buttons">
                <button onClick={() => navigate(`/payment/${selAmount}`)}>
                  네
                </button>
                <button onClick={() => setSelAmount(null)}>
                  아니요
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
