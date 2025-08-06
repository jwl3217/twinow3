// src/components/Payment.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate }      from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import '../styles/Payment.css';

export default function Payment() {
  const { amount }   = useParams();           // URL param: 구매할 코인 개수
  const navigate     = useNavigate();
  const [orderId, setOrderId]   = useState(null);
  const [bankInfo, setBankInfo] = useState(null);
  const [checking, setChecking] = useState(false);

  // Firebase Functions 인스턴스 & Callable 함수
  const functions     = getFunctions();
  const createPayment = httpsCallable(functions, 'createPayment');
  const getStatus     = httpsCallable(functions, 'getPaymentStatus');

  // 1) 컴포넌트 마운트 시 결제 주문 생성 요청
  useEffect(() => {
    const initPayment = async () => {
      try {
        const { data } = await createPayment({ amount: Number(amount) });
        setOrderId(data.orderId);
        // 은행·계좌번호 고정, 나머지는 응답에서
        setBankInfo({
          bank:           '하나은행',
          account_number: '31191046973307',
          account_holder: data.bankInfo.account_holder,
          expires_at:     data.bankInfo.expires_at,
          amount:         Number(amount)
        });
      } catch (e) {
        console.error(e);
        alert('결제 주문 생성에 실패했습니다.\n' + e.message);
      }
    };
    initPayment();
  }, [amount, createPayment]);

  // 2) 입금 확인 버튼 클릭
  const checkPayment = async () => {
    if (!orderId) return;
    setChecking(true);
    try {
      const { data } = await getStatus({ orderId });
      if (data.status === 'completed') {
        alert('입금이 확인되었습니다! 코인이 충전됩니다.');
        navigate('/feed');
      } else {
        alert('아직 입금이 확인되지 않았습니다.');
      }
    } catch (e) {
      console.error(e);
      alert('결제 상태 확인 중 오류가 발생했습니다.');
    }
    setChecking(false);
  };

  if (!bankInfo) {
    return <div className="payment-container">결제 정보를 불러오는 중...</div>;
  }

  return (
    <div className="payment-container">
      <h2>무통장 입금 안내</h2>
      <p>
        아래 계좌로 <strong>{bankInfo.amount.toLocaleString()}원</strong>을<br/>
        입금해 주세요.
      </p>
      <ul className="bank-info">
        <li>은행: {bankInfo.bank}</li>
        <li>계좌번호: {bankInfo.account_number}</li>
        <li>예금주: {bankInfo.account_holder}</li>
        <li>입금 기한: {new Date(bankInfo.expires_at).toLocaleString()}</li>
      </ul>

      <button
        className="confirm-button"
        onClick={checkPayment}
        disabled={checking}
      >
        {checking ? '확인 중...' : '입금 확인'}
      </button>
    </div>
  );
}
