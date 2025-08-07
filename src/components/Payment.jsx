import React, { useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import '../styles/Payment.css';

export default function Payment() {
  const { amount }    = useParams();
  const payAmount     = Number(amount);
  const location      = useLocation();
  const navigate      = useNavigate();
  const depositorName = location.state?.depositorName;

  useEffect(() => {
    if (!depositorName) {
      // 입금자명 없으면 처음 단계로 되돌리기
      return navigate(`/enter-depositor/${payAmount}`, { replace: true });
    }

    const script = document.createElement('script');
    script.src   = 'https://widget.payaction.app/sdk/standard.js';
    script.async = true;
    script.onload = () => {
      window.PayActionWidget.init({
        clientKey:    'ZDSK7NP8TSBN',
        targetElement:'#payaction-widget',
        orderId:      `pa_${Date.now()}`,
        amount:       payAmount,
        depositorName,                            // 필수 옵션 추가
        cancelDate:   new Date(Date.now() + 24*3600*1000),
        buttons: {
          home:   { text: '피드로',    url: '/feed' },
          mypage: { text: '주문내역',  url: '/mypage' }
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
      <div id="payaction-widget" />
      <div style={{ marginTop: 16, fontSize: 14 }}>
        <p>입금자명: <strong>{depositorName}</strong></p>
        <p>입금 계좌: 하나은행 311-910469-73307 (예금주: 이재원)</p>
      </div>
    </div>
  );
}
