// src/components/ManualPayment.jsx

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './ManualPayment.css'; // 필요하면 스타일 정의

export default function ManualPayment() {
  const { amount: paramAmount, depositorName: paramName } = useParams();
  const navigate = useNavigate();

  // 폼 입력 상태
  const [amount]           = useState(paramAmount);        // URL 파라미터
  const [depositorName]    = useState(paramName);          // URL 파라미터
  const [buyerPhone, setBuyerPhone]             = useState('');
  const [buyerEmail, setBuyerEmail]             = useState('');
  const [cashbillType, setCashbillType]         = useState('소득공제'); // 기본값
  const [cashbillIdentifier, setCashbillIdentifier] = useState('');
  const [loading, setLoading]                   = useState(false);
  const [error, setError]                       = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    // 최소한의 유효성 검사
    if (!buyerPhone.match(/^\d+$/)) {
      setError('휴대폰 번호는 숫자만 입력해주세요.');
      setLoading(false);
      return;
    }
    if (cashbillIdentifier && !cashbillIdentifier.match(/^\d+$/)) {
      setError('현금영수증 식별번호는 숫자만 입력해주세요.');
      setLoading(false);
      return;
    }

    try {
      const resp = await fetch(
        'https://api-ujypgdcuxa-uc.a.run.app/api/createPayment',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            merchantUid:        `MO-${Date.now()}`,  // 고유 주문번호
            amount:             parseInt(amount, 10),
            depositorName,                             
            buyerPhone,                                
            buyerEmail,                                
            cashbillType,            // '소득공제' 또는 '지출증빙'
            cashbillIdentifier      // 휴대폰번호 또는 사업자번호
          })
        }
      );

      const result = await resp.json();
      if (!resp.ok || result.order?.status === 'error') {
        // 페이액션 API가 "누락된 필드" 같은 에러를 반환하면 result.order.response.message 에 담겨있습니다.
        throw new Error(result.order?.response?.message || '주문 생성 실패');
      }

      // 성공 시 콘솔에 찍고, 관리자 페이지나 확인 화면으로 이동
      console.log('주문 생성 성공:', result);
      alert('주문이 생성되었습니다. 페이액션 대시보드에서 확인하세요.');
      navigate('/shop');
    } catch (err) {
      console.error('결제 주문 생성 에러:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="manual-payment-container">
      <h2>무통장 입금 안내</h2>
      <p>아래 정보를 확인하신 후, 고객님께 입금 안내를 해주세요.</p>

      <div className="order-info">
        <div><strong>주문번호:</strong> MO-{Date.now()}</div>
        <div><strong>입금자명:</strong> {depositorName}</div>
        <div><strong>금액:</strong> {amount}원</div>
      </div>

      <form onSubmit={onSubmit} className="manual-payment-form">
        <label>
          주문자 휴대폰번호*
          <input
            type="text"
            value={buyerPhone}
            onChange={e => setBuyerPhone(e.target.value)}
            placeholder="숫자만 입력"
            required
          />
        </label>

        <label>
          주문자 이메일
          <input
            type="email"
            value={buyerEmail}
            onChange={e => setBuyerEmail(e.target.value)}
            placeholder="example@example.com"
          />
        </label>

        <label>
          현금영수증 거래구분
          <select
            value={cashbillType}
            onChange={e => setCashbillType(e.target.value)}
          >
            <option value="소득공제">소득공제용</option>
            <option value="지출증빙">지출증빙용</option>
          </select>
        </label>

        <label>
          현금영수증 식별번호
          <input
            type="text"
            value={cashbillIdentifier}
            onChange={e => setCashbillIdentifier(e.target.value)}
            placeholder={
              cashbillType === '소득공제' 
                ? '휴대폰번호 숫자만 입력' 
                : '사업자번호 숫자만 입력'
            }
          />
        </label>

        {error && <div className="error-message">{error}</div>}

        <button type="submit" disabled={loading}>
          {loading ? '주문 생성 중…' : '주문 생성'}
        </button>
      </form>
    </div>
  );
}
