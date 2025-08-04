// src/components/Payment.jsx

import React from 'react';
import { useParams }      from 'react-router-dom';
import backArrow          from '../assets/back-arrow.png';
import '../styles/Payment.css';

export default function Payment() {
  const { amount } = useParams();
  const coinCount  = Number(amount);
  const priceMap   = {15000:4700,20000:12000,30000:20000,50000:35000};
  const payAmount  = priceMap[coinCount]||0;
  const orderId    = `order_${Date.now()}`;
  const returnUrl  = `${window.location.origin}/payment/result`;

  const payOptions = {
    clientId:   'R2_e7af7dfe1d684817a588799dbceadc61',
    method:     'card',
    orderId,
    amount:     payAmount,
    goodsName:  `코인 ${coinCount.toLocaleString()}개`,
    returnUrl,                   // ← 반드시 포함
    fnSuccess: data => {
      // 인증 성공 후 자동 승인 처리 위해
      window.location.href = `${returnUrl}?merchantUid=${orderId}&tid=${data.tid}&amount=${coinCount}`;
    },
    fnCancel: () => alert('결제를 취소했습니다.'),
    fnError: err => alert('결제 오류: ' + (err.msg||JSON.stringify(err)))
  };

  const onPayClick = () => {
    if (!window.AUTHNICE?.requestPay) {
      alert('결제 모듈 준비 중입니다.');
      return;
    }
    window.AUTHNICE.requestPay(payOptions);
  };

  return (
    <div className="payment-container">
      <header className="detail-header">
        <button className="back-button" onClick={() => history.back()}>
          <img src={backArrow} alt="뒤로가기" />
        </button>
        <span className="header-title">결제하기</span>
      </header>
      <div className="detail-separator" />
      <div className="detail-body">
        <div className="payment-info">
          <p>코인 {coinCount.toLocaleString()}개 구매</p>
          <p>총 결제 금액: {payAmount.toLocaleString()}원</p>
        </div>
        <button className="pay-button" onClick={onPayClick}>
          결제하기
        </button>
      </div>
    </div>
  );
}
