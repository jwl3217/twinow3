// src/components/Payment.jsx

import React, { useEffect } from 'react';
import { useParams }       from 'react-router-dom';
import '../styles/Payment.css';

export default function Payment() {
  const { amount, depositorName } = useParams();
  const payAmount = Number(amount);

  useEffect(() => {
    // SDK 로드 & 위젯 초기화
    const script = document.createElement('script');
    script.src   = 'https://widget.payaction.app/sdk/standard.js';
    script.async = true;
    script.onload = () => {
      window.PayActionWidget.init({
        clientKey:     'ZDSK7NP8TSBN',
        targetElement: '#payaction-widget',
        orderId:       `pa_${Date.now()}`,
        amount:        payAmount,
        depositorName: decodeURIComponent(depositorName),
        cancelDate:    new Date(Date.now() + 24 * 3600 * 1000),
        buttons: {
          home:   { text: '피드로',   url: '/feed' },
          mypage: { text: '주문내역', url: '/mypage' }
        }
      });
    };
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, [payAmount, depositorName]);

  return (
    <div className="payment-container">
      <header className="detail-header">
        <h2>무통장 입금</h2>
      </header>
      <div className="detail-separator" />
      <div id="payaction-widget" />
      <div style={{ marginTop: 16, fontSize: 14 }}>
        <p>입금 계좌: 하나은행 311-910469-73307 (예금주: 이재원)</p>
      </div>
    </div>
  );
}
