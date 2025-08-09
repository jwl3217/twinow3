// src/components/PayCheckout.jsx
import React, { useMemo } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import backArrow from "../assets/back-arrow.png";
import "../styles/Shop.css";

export default function PayCheckout() {
  const { orderNo } = useParams();
  const nav = useNavigate();
  const { state } = useLocation();

  // 새로고침 대비: 쿼리파라미터도 지원
  const qs = useMemo(() => new URLSearchParams(window.location.search), []);
  const coins   = state?.coins   ?? (Number(qs.get("coins"))  || 0);
  const amount  = state?.amount  ?? (Number(qs.get("amount")) || 0);
  const payer   = state?.payer   ?? (qs.get("payer") || "");
  const bank    = state?.bank    ?? "하나은행";
  const account = state?.account ?? "31191046973307";
  const holder  = state?.holder  ?? "이재원";

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("복사되었습니다.");
    } catch {}
  };

  return (
    <div className="shop-container">
      <header className="shop-header">
        <button className="back-button" onClick={() => nav(-1)}>
          <img src={backArrow} alt="뒤로가기" />
        </button>
        <span className="header-title">입금 안내</span>
      </header>

      <div className="shop-separator" />

      <div className="shop-body">
        <div className="shop-card" style={{ flexDirection: "column", alignItems: "stretch" }}>
          <p style={{ margin: 0, fontWeight: "bold" }}>주문번호</p>
          <p style={{ marginTop: 4 }}>{orderNo}</p>

          <p style={{ margin: "16px 0 0", fontWeight: "bold" }}>구매 코인</p>
          <p style={{ marginTop: 4 }}>{coins.toLocaleString()}개</p>

          <p style={{ margin: "16px 0 0", fontWeight: "bold" }}>입금 금액</p>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <p style={{ margin: "4px 0" }}>{amount.toLocaleString()}원</p>
            <button className="shop-card-btn" onClick={() => copy(String(amount))}>복사</button>
          </div>

          <p style={{ margin: "16px 0 0", fontWeight: "bold" }}>입금자명</p>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <p style={{ margin: "4px 0" }}>{payer}</p>
            <button className="shop-card-btn" onClick={() => copy(payer)}>복사</button>
          </div>

          <p style={{ margin: "16px 0 0", fontWeight: "bold" }}>입금 계좌</p>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <p style={{ margin: "4px 0" }}>
              {bank} {account} ({holder})
            </p>
            <button
              className="shop-card-btn"
              onClick={() => copy(`${bank} ${account} ${holder}`)}
            >
              복사
            </button>
          </div>

          <div style={{ marginTop: 16, color: "#555", lineHeight: 1.6 }}>
            <p style={{ margin: 0 }}>입금 후 1초 이내 자동확인됩니다. 확인 즉시 코인이 충전돼요.</p>
            <p style={{ margin: 0 }}>입금자명과 금액은 반드시 위 내용과 동일해야 합니다.</p>
          </div>
        </div>

        <button className="shop-card-btn" onClick={() => nav("/feed")}>
          확인
        </button>
      </div>
    </div>
  );
}
