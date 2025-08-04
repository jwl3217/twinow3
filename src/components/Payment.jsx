// src/components/Payment.jsx

import React from 'react';
import { useParams, useNavigate }      from 'react-router-dom';
import { auth, db }                    from '../firebaseConfig';
import { doc, getDoc, updateDoc }      from 'firebase/firestore';
import backArrow                        from '../assets/back-arrow.png';
import '../styles/Payment.css';

export default function Payment() {
  const { amount } = useParams();
  const navigate  = useNavigate();
  const coinCount = Number(amount);
  const priceMap  = {15000:4700,20000:12000,30000:20000,50000:35000};
  const payAmount = priceMap[coinCount] || 0;
  const orderId   = `order_${Date.now()}`;

  const payOptions = {
    clientId:  'R2_e7af7dfe1d684817a588799dbceadc61',
    method:    'card',
    orderId,
    amount:    payAmount,
    goodsName: `코인 ${coinCount.toLocaleString()}개`,
    // returnUrl 제거 — 팝업에서 fnSuccess가 호출되도록
    fnSuccess: async data => {
      try {
        const res = await fetch('/api/pay/approve', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ merchantUid: orderId, tid: data.tid })
        });
        const result = await res.json();
        if (!result.ok) {
          alert('결제 승인 실패: ' + result.error);
          return;
        }

        const user = auth.currentUser;
        if (user) {
          const userRef = doc(db, 'users', user.uid);
          const snap    = await getDoc(userRef);
          const prev    = snap.data()?.coins || 0;
          await updateDoc(userRef, { coins: prev + coinCount });
        }

        alert('결제 완료! 코인이 추가되었습니다.');
        navigate('/feed', { replace: true });
      } catch (e) {
        console.error(e);
        alert('결제 처리 중 오류가 발생했습니다.');
      }
    },
    fnCancel: () => {
      alert('결제를 취소했습니다.');
    },
    fnError: err => {
      alert('결제 오류: ' + (err.msg || JSON.stringify(err)));
    },
  };

  const onPayClick = () => {
    if (!window.AUTHNICE?.requestPay) {
      alert('결제 모듈 준비 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    window.AUTHNICE.requestPay(payOptions);
  };

  return (
    <div className="payment-container">
      <header className="detail-header">
        <button
          type="button"
          className="back-button"
          onClick={() => navigate(-1)}
        >
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
        <button
          type="button"
          className="pay-button"
          onClick={onPayClick}
        >
          결제하기
        </button>
      </div>
    </div>
  );
}
