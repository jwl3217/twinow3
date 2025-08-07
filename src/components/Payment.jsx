// 경로: src/components/Payment.jsx

import React, { useEffect } from 'react';
import { useParams }       from 'react-router-dom';
import '../styles/Payment.css';

export default function Payment() {
  const { amount } = useParams();
  const payAmount  = Number(amount);

  useEffect(() => {
    // 1) SDK 로드
    const script = document.createElement('script');
    script.src   = 'https://widget.payaction.app/sdk/standard.js';
    script.async = true;
    script.onload = () => {
      // 2) 위젯 초기화
      window.PayActionWidget.init({
        clientKey:    'ZDSK7NP8TSBN',
        targetElement:'#payaction-widget',
        orderId:      `pa_${Date.now()}`,       // 임의 주문번호
        amount:       payAmount,                // 결제금액
        cancelDate:   new Date(Date.now() + 24*3600*1000), // 24시간 후 자동취소
        buttons: {
          home:   { text: '피드로',    url: '/feed' },
          mypage: { text: '주문내역',  url: '/mypage' }
        }
      });
    };
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, [payAmount]);

  return (
    <div className="payment-container">
      <header className="detail-header">
        <h2>무통장 입금</h2>
      </header>
      <div className="detail-separator" />
      {/* 3) 위젯이 여기 표시됩니다 */}
      <div id="payaction-widget" />
      {/* 4) 계좌번호 직접 안내(위젯 외에도 명시적으로 보여주고 싶다면) */}
      <div style={{ marginTop: 16, fontSize:14 }}>
        <p>입금 계좌: 하나은행 311-910469-73307 (예금주: 페이액션)</p>
      </div>
    </div>
  );
}
