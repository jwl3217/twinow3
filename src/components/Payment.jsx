import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/Payment.css';

export default function Payment() {
  const { amount, depositorName: rawName } = useParams();
  const payAmount     = Number(amount);
  const depositorName = decodeURIComponent(rawName || '');
  const navigate      = useNavigate();

  useEffect(() => {
    // 입금자명이 없으면 다시 입력 페이지로
    if (!depositorName) {
      navigate(`/enter-depositor/${payAmount}`, { replace: true });
      return;
    }

    // PayAction SDK 로드 & init
    const script = document.createElement('script');
    script.src   = 'https://widget.payaction.app/sdk/standard.js';
    script.async = true;
    script.onload = () => {
      window.PayActionWidget.init({
        clientKey:     'ZDSK7NP8TSBN',
        targetElement: '#payaction-widget',
        orderId:       `pa_${Date.now()}`,
        amount:        payAmount,
        depositorName,                           // 필수 옵션!
        cancelDate:    new Date(Date.now() + 24*3600*1000),
        buttons: {
          home:   { text: '피드로',   url: '/feed' },
          mypage: { text: '주문내역', url: '/mypage' }
        }
      });
    };
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, [payAmount, depositorName, navigate]);

  return (
    <div className="payment-container">
      <header className="detail-header">
        <h2>무통장 입금</h2>
      </header>
      <div className="detail-separator" />
      {/* 위젯 렌더링 지점 */}
      <div id="payaction-widget" />
      {/* 직접 안내 */}
      <div style={{ marginTop: 16, fontSize: 14 }}>
        <p>입금자명: <strong>{depositorName}</strong></p>
        <p>입금 계좌: 하나은행 311-910469-73307 (예금주: 이재원)</p>
      </div>
    </div>
  );
}
