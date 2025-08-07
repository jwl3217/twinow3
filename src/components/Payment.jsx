import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/Payment.css';

export default function Payment() {
  const { amount, depositorName } = useParams();           // URL 파라미터로 넘어온 입금자명
  const payAmount  = Number(amount);
  const navigate   = useNavigate();

  useEffect(() => {
    // 1) 입금자명이 없으면 다시 입력받기
    if (!depositorName) {
      navigate(`/enter-depositor/${amount}`);
      return;
    }

    // 2) 백엔드에 결제 주문 생성 요청 → 내 계좌 정보와 order 반환
    (async () => {
      try {
        const res = await fetch('/createPayment', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ amount: payAmount })
        });
        if (!res.ok) throw new Error(`createPayment failed: ${res.status}`);

        const {
          orderNumber,
          autoCancelAt,
          bankName,
          accountNumber,
          accountHolder
        } = await res.json();

        // 3) SDK 로드 & init
        const script = document.createElement('script');
        script.src   = 'https://widget.payaction.app/sdk/standard.js';
        script.async = true;
        script.onload = () => {
          window.PayActionWidget.init({
            clientKey:    'ZDSK7NP8TSBN',
            targetElement:'#payaction-widget',
            orderId:      orderNumber,               // 백엔드에서 받은 주문번호
            amount:       payAmount,
            depositorName: decodeURIComponent(depositorName),  // 방금 입력한 입금자명
            bankName,                                  // 내 계좌 정보
            accountNumber,
            accountHolder,
            cancelDate:   new Date(autoCancelAt),
            buttons: {
              home:   { text: '피드로',    url: '/feed' },
              mypage: { text: '주문내역',  url: '/mypage' }
            }
          });
        };
        document.body.appendChild(script);

        // 언마운트 시 스크립트 제거
        return () => document.body.removeChild(script);

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
      {/* PayAction 위젯이 렌더링될 자리 */}
      <div id="payaction-widget" />
    </div>
  );
}
