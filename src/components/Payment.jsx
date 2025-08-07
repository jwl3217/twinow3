// 경로: src/components/Payment.jsx

import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/Payment.css';

export default function Payment() {
  const { amount, depositorName } = useParams();  
  const payAmount  = Number(amount);
  const navigate   = useNavigate();

  useEffect(() => {
    // 1) 입금자명이 없으면 다시 입력 페이지로
    if (!depositorName) {
      navigate(`/enter-depositor/${amount}`);
      return;
    }

    // 2) 서버에 결제 주문 생성 요청 → 가상계좌 정보 내려받기
    (async () => {
      try {
        const res = await fetch('/createPayment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: payAmount })
        });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const {
          orderNumber,
          autoCancelAt,
          bankName,
          accountNumber,
          accountHolder
        } = await res.json();

        // 3) SDK 스크립트 로드 & init
        const script = document.createElement('script');
        script.src   = 'https://widget.payaction.app/sdk/standard.js';
        script.async = true;
        script.onload = () => {
          window.PayActionWidget.init({
            clientKey:    'ZDSK7NP8TSBN',
            targetElement:'#payaction-widget',
            orderId:      orderNumber,
            amount:       payAmount,
            depositorName,                  // 사용자가 입력한 입금자명
            bankName,                       // 백엔드에서 내려준 은행명
            accountNumber,                  // 백엔드에서 내려준 계좌번호
            accountHolder,                  // 백엔드에서 내려준 예금주명
            cancelDate:   new Date(autoCancelAt),
            buttons: {
              home:   { text: '피드로',    url: '/feed' },
              mypage: { text: '주문내역',  url: '/mypage' }
            }
          });
        };
        document.body.appendChild(script);

        // cleanup
        return () => {
          document.body.removeChild(script);
        };

      } catch (err) {
        console.error('결제 생성 오류:', err);
      }
    })();
  }, [amount, depositorName, payAmount, navigate]);

  return (
    <div className="payment-container">
      <header className="detail-header">
        <h2>무통장 입금</h2>
      </header>
      <div className="detail-separator" />
      {/* 위젯이 이곳에 렌더링됩니다 */}
      <div id="payaction-widget" />
      {/* SDK 옵션에 이미 계좌 정보가 들어가 있지만, 추가 안내가 필요하면 여기에 별도 표시 */}
    </div>
  );
}
