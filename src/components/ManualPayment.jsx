import React, { useState, useEffect } from 'react';
import { useParams, useNavigate }    from 'react-router-dom';
import '../styles/ManualPayment.css';

export default function ManualPayment() {
  const { amount, depositorName } = useParams(); // URL: /payment/:amount/:depositorName
  const navigate = useNavigate();

  const [orderInfo, setOrderInfo] = useState(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    // Depositor 없으면 다시 입력 페이지로
    if (!depositorName) {
      navigate(`/enter-depositor/${amount}`);
      return;
    }

    (async () => {
      try {
        const res = await fetch('/api/createPayment', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': 'ZDSK7NP8TSBN', 'x-mall-id': '1754495682975x949667080623358000' },
          body: JSON.stringify({
            amount:        Number(amount),
            depositorName: decodeURIComponent(depositorName)
          })
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`status ${res.status} / ${text}`);
        }
        const info = await res.json();
        setOrderInfo(info);
      } catch (err) {
        console.error('결제 주문 생성 실패:', err);
        alert('결제 정보를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    })();
  }, [amount, depositorName, navigate]);

  if (loading) {
    return (
      <div className="manual-payment">
        <p>결제 정보를 불러오는 중...</p>
      </div>
    );
  }
  if (!orderInfo) {
    return (
      <div className="manual-payment">
        <p>결제 정보를 가져올 수 없습니다.</p>
      </div>
    );
  }

  const {
    orderNumber,
    autoCancelAt,
    bankName,
    accountNumber,
    accountHolder,
    amount: payAmount
  } = orderInfo;

  return (
    <div className="manual-payment">
      <h2>무통장 입금 안내</h2>
      <dl>
        <dt>주문번호</dt><dd>{orderNumber}</dd>
        <dt>입금액</dt><dd>{payAmount.toLocaleString()}원</dd>
        <dt>입금은행</dt><dd>{bankName}</dd>
        <dt>계좌번호</dt><dd>{accountNumber}</dd>
        <dt>예금주</dt><dd>{accountHolder}</dd>
        <dt>입금자명</dt><dd>{decodeURIComponent(depositorName)}</dd>
        <dt>입금 기한</dt><dd>{new Date(autoCancelAt).toLocaleString()}</dd>
      </dl>
      <div className="buttons">
        <button onClick={() => navigate('/feed')}>입금했어요</button>
        <button onClick={() => navigate('/feed')}>나중에 입금할게요</button>
      </div>
    </div>
  );
}
