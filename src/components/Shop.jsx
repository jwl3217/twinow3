// src/components/Shop.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebaseConfig";
import coinImg from "../assets/coin.png";
import backArrow from "../assets/back-arrow.png";
import "../styles/Shop.css";

export default function Shop() {
  const navigate = useNavigate();

  const options = [
    { coins: 15000, amount: 3500,  label: "3,500원(강추)" },
    { coins: 20000, amount: 12000, label: "12,000원" },
    { coins: 30000, amount: 20000, label: "20,000원" },
    { coins: 50000, amount: 35000, label: "35,000원" },
  ];

  const [sel, setSel] = useState(null);
  const [payer, setPayer] = useState("");

  const closeModal = () => {
    setSel(null);
    setPayer("");
  };

  const createOrder = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert("로그인이 필요합니다.");
      navigate("/", { replace: true });
      return;
    }
    if (!payer.trim()) {
      alert("입금자명을 입력해 주세요.");
      return;
    }
    try {
      const r = await fetch("/api/payaction/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: user.uid,
          coins: sel.coins,
          amount: sel.amount,
          depositorName: payer.trim(),
        }),
      });
      const data = await r.json();
      if (!data.ok) throw new Error(data.error || "order_failed");

      // ✅ 쿼리도 함께 전달(새로고침 대비)
      const q = `?coins=${sel.coins}&amount=${sel.amount}&payer=${encodeURIComponent(
        payer.trim()
      )}`;

      closeModal();
      navigate(`/pay/checkout/${data.order_number}${q}`, {
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
      console.error(e);
      alert("주문 생성 중 오류가 발생했습니다.");
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
        {options.map((o) => (
          <div key={`${o.coins}-${o.amount}`} className="shop-card">
            <div className="shop-card-info">
              <img src={coinImg} alt="coin" className="shop-card-img" />
              <div className="shop-card-text">
                <p className="shop-card-coins">{o.coins.toLocaleString()}개</p>
                <p className="shop-card-price">{o.label}</p>
              </div>
            </div>
            <button className="shop-card-btn" onClick={() => setSel(o)}>
              구매하기
            </button>
          </div>
        ))}

        {sel && (
          <>
            <div className="modal-overlay" onClick={closeModal} />
            <div className="confirm-modal">
              <p style={{ marginBottom: 8 }}>
                코인 {sel.coins.toLocaleString()}개
                <br />
                ({sel.amount.toLocaleString()}원)
                <br />
                구매하시겠습니까?
              </p>

              <input
                placeholder="입금자명 (예: 홍길동)"
                value={payer}
                onChange={(e) => setPayer(e.target.value)}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  margin: "8px 0 12px",
                  padding: "10px",
                  border: "1px solid #ccc",
                  borderRadius: 6,
                  fontSize: 16,
                }}
              />

              <div className="confirm-buttons">
                <button onClick={createOrder} disabled={!payer.trim()}>네</button>
                <button onClick={closeModal}>아니요</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
