// 경로: src/components/CoinModal.jsx

import React from 'react';
import '../styles/CoinModal.css';

export default function CoinModal({ type, onConfirm, onCancel }) {
  return (
    <div className="coin-modal-overlay">
      <div className="coin-modal">
        {type === 'useCoin' ? (
          <>
            <p className="coin-modal-text">
              코인 <span className="highlight">100개</span>를 사용하여<br/>
              메시지를 전송하시겠습니까?
            </p>
            <div className="coin-modal-buttons">
              <button className="btn btn-confirm" onClick={onConfirm}>네</button>
              <button className="btn btn-cancel" onClick={onCancel}>아니요</button>
            </div>
          </>
        ) : (
          <>
            <p className="coin-modal-text">
              사용할 수 있는 코인이 없습니다.
            </p>
            <div className="coin-modal-buttons">
              <button className="btn btn-confirm" onClick={onConfirm}>
                코인 구매하러 가기
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
