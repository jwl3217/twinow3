// src/components/Shop.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, limit, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

import coinImg from '../assets/coin.png';
import backArrow from '../assets/back-arrow.png';
import '../styles/Shop.css';

const PACKS = [
  { coins: 15000, label: '3,500원(강추)', amount: 3500 },
  { coins: 20000, label: '12,000원',       amount: 12000 },
  { coins: 30000, label: '20,000원',       amount: 20000 },
  { coins: 50000, label: '35,000원',       amount: 35000 },
];

export default function Shop() {
  const navigate = useNavigate();
  const [currentUid, setCurrentUid] = useState(null);
  const [sel, setSel] = useState(null);
  const [myOrder, setMyOrder] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) return navigate('/', { replace: true });
      setCurrentUid(u.uid);
    });
    return () => unsub();
  }, [navigate]);

  useEffect(() => {
    if (!currentUid) return;
    const q = query(
      collection(db, 'order'),
      where('uid', '==', currentUid),
      where('orderstate', '==', 'incomplete'),
      limit(1)
    );
    const unsub = onSnapshot(q, (snap) => {
      if (snap.empty) setMyOrder(null);
      else setMyOrder({ id: snap.docs[0].id, ...snap.docs[0].data() });
    });
    return () => unsub();
  }, [currentUid]);

  return (
    <div className="shop-container">
      <header className="shop-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <img src={backArrow} alt="뒤로가기" className="back-btn-icon" />
        </button>
        <span className="header-title">코인 구매</span>
      </header>

      <div className="shop-separator" />

      <div className="shop-body">
        {PACKS.map(({ coins, label, amount }) => (
          <div key={coins} className="shop-card">
            <div className="shop-card-info">
              <img src={coinImg} alt="coin" className="shop-card-img" />
              <div className="shop-card-text">
                <p className="shop-card-coins">{coins.toLocaleString()}개</p>
                <p className="shop-card-price">{label}</p>
              </div>
            </div>
            <button
              className="shop-card-btn"
              onClick={() => setSel({ coins, amount })}
              disabled={!!myOrder}
              title={myOrder ? '진행 중인 주문이 있어 새 주문을 만들 수 없습니다.' : undefined}
            >
              구매하기
            </button>
          </div>
        ))}

        {/* ▶ 나의 진행중 주문 카드: 이미지 제거 / 세로배치 / 중앙정렬 / 버튼 아래 */}
{myOrder && (
  <div className="shop-card shop-card--myorder">
    <div className="shop-myorder-text">
      <p className="shop-card-coins">
        나의 진행중 주문 · {myOrder.coins.toLocaleString()}개
      </p>
      <p className="shop-card-price">
        {myOrder.amount.toLocaleString()}원 · (입금확인 전)
      </p>
    </div>
    <button
      className="shop-card-btn"
      onClick={() => navigate(`/my-order/${myOrder.id}`)}
    >
      자세히
    </button>
  </div>
)}


        {sel && (
          <>
            <div className="shop-modal-overlay" onClick={() => setSel(null)} />
            <div className="shop-confirm-modal">
              <p>
                코인 {sel.coins.toLocaleString()}개를
                <br />
                {sel.amount.toLocaleString()}원에 구매하시겠습니까?
              </p>
              <div className="shop-confirm-buttons">
                <button
                  onClick={() => {
                    const url = `/checkout/manual?coins=${sel.coins}&amount=${sel.amount}`;
                    setSel(null);
                    navigate(url);
                  }}
                >
                  네
                </button>
                <button onClick={() => setSel(null)}>아니요</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
