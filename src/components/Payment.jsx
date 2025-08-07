// src/components/Payment.jsx

import React, { useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import '../styles/Payment.css';

export default function Payment() {
  const { amount }    = useParams();
  const payAmount     = Number(amount);
  const { search }    = useLocation();
  const navigate      = useNavigate();
  const depositorName = new URLSearchParams(search).get('depositor');

  useEffect(() => {
    // 1) 입금자명이 없으면 예금주 입력 페이지로 리다이렉트
    if (!depositorName) {
      navigate(`/enter-depositor/${amount}`);
      return;
    }

    // 2) PayAction SDK 로드 및 init 호출 (depositorName 옵션 반드시 포함)
    const script = document.createElement('script');
    script.src   = 'https://widget.payaction.app/sdk/standard.js';
    script.async = true;
    script.onload = () => {
      window.PayActionWidget.init({
        clientKey:    'ZDSK7NP8TSBN',
        targetElement:'#payaction-widget',
        orderId:      `pa_${Date.now()}`,       // 임의 주문번호
        amount:       payAmount,                // 결제금액
        depositorName,                          // 입금자명 (필수)
        cancelDate:   new Date(Date.now() + 24*3600*1000), // 24시간 후 자동취소
        buttons: {
          home:   { text: '피드로',    url: '/feed' },
          mypage: { text: '주문내역',  url: '/mypage' }
        }
      });
    };
    document.body.appendChild(script);

    // 언마운트 시 SDK 스크립트 제거
    return () => {
      document.body.removeChild(script);
    };
  }, [amount, payAmount, depositorName, navigate]);

  return (
    <div className="payment-container">
      <header className="detail-header">
        <h2>무통장 입금</h2>
      </header>
      <div className="detail-separator" />
      {/* 3) PayAction 위젯이 이곳에 렌더링 됩니다 */}
      <div id="payaction-widget" />
      {/* 4) 위젯 외에도 계좌 정보를 명시적으로 안내 */}
      <div style={{ marginTop: 16, fontSize: 14 }}>
        <p>입금 계좌: 하나은행 311-910469-73307 (예금주: 이재원)</p>
      </div>
    </div>
  );
}
