// src/components/Payment.jsx

import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/Payment.css';

export default function Payment() {
  const { amount, depositorName } = useParams();      // URL: /payment/:amount/:depositorName
  const payAmount  = Number(amount);
  const navigate   = useNavigate();

  // API 호출용 base URL: dev → 로컬 에뮬레이터, prod → 호스팅 리라이트
  const apiBaseUrl =
    process.env.NODE_ENV === 'development'
      ? 'http://localhost:5001/⟨YOUR_PROJECT_ID⟩/us-central1/api'
      : '/api';

  useEffect(() => {
    // 1) depositorName이 없으면 예금주 입력 페이지로
    if (!depositorName) {
      navigate(`/enter-depositor/${amount}`);
      return;
    }

    (async () => {
      try {
        // 2) 내 서버(createPayment) 호출
        const res = await fetch(`${apiBaseUrl}/createPayment`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount:        payAmount,
            depositorName: decodeURIComponent(depositorName)
          })
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`createPayment failed (${res.status}): ${text}`);
        }
        const {
          orderNumber,
          autoCancelAt,
          bankName,
          accountNumber,
          accountHolder
        } = await res.json();

        // 3) PayAction SDK 로드 & 위젯 init
        const script = document.createElement('script');
        script.src   = 'https://widget.payaction.app/sdk/standard.js';
        script.async = true;
        script.onload = () => {
          window.PayActionWidget.init({
            clientKey:     '⟨YOUR_CLIENT_KEY⟩',
            targetElement: '#payaction-widget',
            orderId:       orderNumber,
            amount:        payAmount,
            depositorName: decodeURIComponent(depositorName),
            bankName,         // 내 계좌정보
            accountNumber,
            accountHolder,
            cancelDate:    new Date(autoCancelAt),
            buttons: {
              home:   { text: '피드로',   url: '/feed' },
              mypage: { text: '주문내역', url: '/mypage' }
            }
          });
        };
        document.body.appendChild(script);

        // clean up on unmount
        return () => document.body.removeChild(script);

      } catch (err) {
        console.error('결제 생성 오류:', err);
      }
    })();
  }, [amount, depositorName, payAmount, navigate, apiBaseUrl]);

  return (
    <div className="payment-container">
      <header className="detail-header">
        <h2>무통장 입금</h2>
      </header>
      <div className="detail-separator" />
      {/* PayAction 위젯이 여기에 렌더링 됩니다 */}
      <div id="payaction-widget" />
    </div>
  );
}
