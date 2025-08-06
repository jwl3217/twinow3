// src/components/Payment.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate }      from 'react-router-dom';
import '../styles/Payment.css';

export default function Payment() {
  const { amount }   = useParams();           // URL param: 구매할 코인 개수
  const navigate     = useNavigate();
  const [orderId, setOrderId]   = useState(null);
  const [bankInfo, setBankInfo] = useState(null);
  const [checking, setChecking] = useState(false);

  // 1) 컴포넌트 마운트 시 결제 주문 생성 요청
  useEffect(() => {
    const initPayment = async () => {
      try {
        const generatedOrderId = `order_${Date.now()}`;
        const resp = await fetch('/createPayment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: Number(amount), orderId: generatedOrderId })
        });
        if (!resp.ok) throw new Error('주문 생성 실패');
        const { orderId: oid, bankInfo: info } = await resp.json();
        setOrderId(oid);
        setBankInfo(info);
      } catch (e) {
        console.error(e);
        alert('결제 주문 생성에 실패했습니다.\n' + e.message);
      }
    };
    initPayment();
  }, [amount]);

  // 2) 입금 확인 버튼 클릭
  const checkPayment = async () => {
    if (!orderId) return;
    setChecking(true);
    try {
      const docResp = await fetch(`/payments/${orderId}`);
      const payment = await docResp.json();
      if (payment.status === 'completed') {
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
