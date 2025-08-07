import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/Payment.css';

export default function Payment() {
  const { amount, depositorName } = useParams();      // URL: /payment/:amount/:depositorName
  const payAmount  = Number(amount);
  const navigate   = useNavigate();

  useEffect(() => {
    // 예금자명 없으면 다시 입력 페이지로
    if (!depositorName) {
      navigate(`/enter-depositor/${amount}`);
      return;
    }

    (async () => {
      try {
        // 1) 백엔드에 주문 생성 요청 (amount + depositorName)
        const res = await fetch('/api/createPayment', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
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

        // 2) PayAction SDK 로드 및 위젯 초기화
        const script = document.createElement('script');
        script.src   = 'https://widget.payaction.app/sdk/standard.js';
        script.async = true;
        script.onload = () => {
          window.PayActionWidget.init({
            clientKey:     'ZDSK7NP8TSBN',
            targetElement: '#payaction-widget',
            orderId:       orderNumber,                    // ← 백엔드에서 내려준 주문번호
            amount:        payAmount,
            depositorName: decodeURIComponent(depositorName),
            bankName,                                      // ← 내 계좌 정보
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

        // 컴포넌트 언마운트 시 스크립트 제거
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
      {/* PayAction 위젯이 여기에 렌더링 됩니다 */}
      <div id="payaction-widget" />
      {/* (선택) 추가 안내 문구 */}
      <div style={{ marginTop: 16, fontSize: 14 }}>
        <p>입금 계좌: 하나은행 311-910469-73307 (예금주: 이재원)</p>
      </div>
    </div>
  );
}
