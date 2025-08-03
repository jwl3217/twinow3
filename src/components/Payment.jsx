// 경로: src/components/Payment.jsx

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import backArrow                   from '../assets/back-arrow.png';
import '../styles/Payment.css';

export default function Payment() {
  const { amount } = useParams();      // URL 파라미터: "/payment/15000" 등
  const navigate  = useNavigate();

  // 1) 코인 갯수별 실제 결제 금액 매핑
  const priceMap = {
    15000: 4700,
    20000: 12000,
    30000: 20000,
    50000: 35000
  };
  const coinCount = Number(amount);
  const payAmount = priceMap[coinCount] || 0; 

  const clientId  = 'R2_e7af7dfe1d684817a588799dbceadc61';
  const returnUrl = `${window.location.origin}/payment/result`;

  // 2) 결제 요청 파라미터 정의
  const payOptions = {
    clientId,                                // 발급받은 클라이언트 키
    method:    'card',                       // 결제 수단: card, trans, vbank 등
    orderId:   `order_${Date.now()}`,        // 유니크 주문번호
    amount:    payAmount,                    // 실제 결제 금액
    goodsName: `코인 ${coinCount.toLocaleString()}개`, // 상품명
    returnUrl,                               // 완료 후 돌아올 URL

    // 3) 콜백 함수들
    fnSuccess: async (data) => {
      try {
        const res = await fetch('/api/pay/approve', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            merchantUid: data.orderId,
            tid:         data.tid
          })
        });
        const result = await res.json();
        if (result.ok) {
          alert('결제 완료되었습니다!');
          navigate('/');
        } else {
          alert('결제 승인 실패: ' + result.error);
        }
      } catch (e) {
        alert('서버 통신 오류');
      }
    },
    fnCancel: () => {
      alert('결제를 취소했습니다.');
    },
    fnError: (err) => {
      alert('결제 중 오류가 발생했습니다:\n' + (err.msg || JSON.stringify(err)));
    }
  };

  // 4) 결제 버튼 클릭 핸들러
  const onPayClick = () => {
    if (!window.AUTHNICE || typeof window.AUTHNICE.requestPay !== 'function') {
      alert('결제 모듈 준비 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    window.AUTHNICE.requestPay(payOptions);
  };

  return (
    <div className="payment-container">
      <header className="detail-header">
        <button className="back-button" onClick={() => navigate(-1)}>
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
