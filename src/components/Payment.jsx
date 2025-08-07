// src/components/Payment.jsx

import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/Payment.css';

export default function Payment() {
  const { amount, depositorName } = useParams();      // /payment/:amount/:depositorName
  const payAmount  = Number(amount);
  const navigate   = useNavigate();

  useEffect(() => {
    // 1) 입금자명이 없으면 다시 입력 페이지로
    if (!depositorName) {
      navigate(`/enter-depositor/${amount}`);
      return;
    }

    (async () => {
      try {
        // ← 여기만 /createPayment → /api/createPayment 로 변경
        const res = await fetch('/api/createPayment', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ amount: payAmount })
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

        // 2) SDK 로드 & init
        const script = document.createElement('script');
        script.src   = 'https://widget.payaction.app/sdk/standard.js';
        script.async = true;
        script.onload = () => {
          window.PayActionWidget.init({
            clientKey:     'ZDSK7NP8TSBN',
            targetElement: '#payaction-widget',
            orderId:       orderNumber,
            amount:        payAmount,
            depositorName: decodeURIComponent(depositorName),
            bankName,         // 내 계좌 정보가 위젯에 표시됩니다
            accountNumber,
            accountHolder,
            cancelDate:    new Date(autoCancelAt),
            buttons: {
              home:   { text: '피드로',    url: '/feed' },
              mypage: { text: '주문내역',  url: '/mypage' }
            }
          });
        };
        document.body.appendChild(script);

        // 언마운트 때 스크립트 제거
        return () => document.body.removeChild(script);

      } catch (err) {
        console.error('결제 생성 오류:', err);
      }
    })();
  }, [amount, depositorName, payAmount, navigate]);

  return (
    <div className="payment-container">
      <header className="detail-header"><h2>무통장 입금</h2></header>
      <div className="detail-separator" />
      {/* 여기에 PayAction 위젯이 렌더링 됩니다 */}
      <div id="payaction-widget" />
    </div>
  );
}
