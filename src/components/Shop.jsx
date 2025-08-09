import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import coinImg from '../assets/coin.png';
import backArrow from '../assets/back-arrow.png';
import '../styles/Shop.css';

const PACKS = [
  { coins: 15000, amount: 3500,  label: '3,500원(강추)' },
  { coins: 20000, amount: 12000, label: '12,000원' },
  { coins: 30000, amount: 20000, label: '20,000원' },
  { coins: 50000, amount: 35000, label: '35,000원' },
];

export default function Shop() {
  const navigate = useNavigate();
  const [sel, setSel] = useState(null); // {coins, amount}
  const [payer, setPayer] = useState("");

  const createOrder = async () => {
    if (!sel) return;
    if (!payer.trim()) {
      alert("입금자명을 입력해 주세요.");
      return;
    }
    const orderNo = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    try {
      const r = await fetch("/api/payaction/order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          order_number: orderNo,
          amount: sel.amount,
          depositor_name: payer.trim(),
        }),
      });

      const text = await r.text();
      let data = null;
      try { data = JSON.parse(text); } catch { /* not json */ }

      if (!r.ok) {
        // 서버가 프록시한 에러 메시지 그대로 노출
        alert(`주문 생성 실패 (${r.status})\n${text}`);
        return;
      }

      // 성공 → 결제안내 페이지로 이동
      navigate(`/checkout/${orderNo}?coins=${sel.coins}&amount=${sel.amount}&payer=${encodeURIComponent(payer.trim())}`, {
        state: {
          coins: sel.coins,
          amount: sel.amount,
          payer: payer.trim(),
          bank: "하나은행",
          account: "31191046973307",
          holder: "이재원",
        },
      });
    } catch (e) {
      alert(`주문 생성 중 오류: ${e?.message || e}`);
    } finally {
      setSel(null);
    }
  };

  return (
    <div className="shop-container">
      <header className="shop-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <img src={backArrow} alt="뒤로가기" />
        </button>
        <span className="header-title">코인 구매</span>
      </header>

      <div className="shop-separator" />

      <div className="shop-body">
        {/* 입금자명 입력 */}
        <div className="shop-card" style={{ marginBottom: 16 }}>
          <div style={{ width: "100%" }}>
            <p style={{ margin: "0 0 8px", fontWeight: 600 }}>입금자명</p>
            <input
              placeholder="입금하실 이름을 입력"
              value={payer}
              onChange={(e) => setPayer(e.target.value)}
              style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
            />
          </div>
        </div>

        {/* 상품 카드 */}
        {PACKS.map(({ coins, amount, label }) => (
          <div key={coins} className="shop-card">
            <div className="shop-card-info">
              <img src={coinImg} alt="coin" className="shop-card-img" />
              <div className="shop-card-text">
                <p className="shop-card-coins">{coins.toLocaleString()}개</p>
                <p className="shop-card-price">{label}</p>
              </div>
            </div>
            <button className="shop-card-btn" onClick={() => setSel({ coins, amount })}>
              구매하기
            </button>
          </div>
        ))}

        {/* 확인 모달 */}
        {sel && (
          <>
            <div className="modal-overlay" onClick={() => setSel(null)} />
            <div className="confirm-modal">
              <p>
                코인 {sel.coins.toLocaleString()}개를
                <br />
                {sel.amount.toLocaleString()}원에 구매하시겠습니까?
              </p>
              <div className="confirm-buttons">
                <button onClick={createOrder}>네</button>
                <button onClick={() => setSel(null)}>아니요</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
