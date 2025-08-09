// src/components/ManualCheckout.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { addDoc, collection, serverTimestamp, query, where, limit, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import backArrow from '../assets/back-arrow.png';
import '../styles/ManualCheckout.css';

export default function ManualCheckout() {
  const nav = useNavigate();
  const { search } = useLocation();
  const params = useMemo(() => new URLSearchParams(search), [search]);

  const coins = Number(params.get('coins') || 0);
  const amount = Number(params.get('amount') || 0);

  const [uid, setUid] = useState(null);
  const [payer, setPayer] = useState('');
  const [leavingAsk, setLeavingAsk] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) return nav('/', { replace: true });
      setUid(u.uid);
    });
    return () => unsub();
  }, [nav]);

  // BottomNav 숨김
  useEffect(() => {
    const b = document.querySelector('.bottom-nav');
    if (b) b.style.display = 'none';
    return () => { if (b) b.style.display = ''; };
  }, []);

  useEffect(() => {
    if (!coins || !amount) nav('/shop', { replace: true });
  }, [coins, amount, nav]);

  const handleCreate = async () => {
    if (!uid) return;
    const name = payer.trim();
    if (!name) return alert('입금자명을 입력해 주세요.');
    setSaving(true);
    try {
      const q = query(collection(db, 'order'), where('uid', '==', uid), where('orderstate', '==', 'incomplete'), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const exists = snap.docs[0];
        alert('이미 진행 중인 주문이 있습니다.');
        return nav(`/my-order/${exists.id}`, { replace: true });
      }
      const ref = await addDoc(collection(db, 'order'), {
        uid,
        orderstate: 'incomplete',
        coins,
        amount,
        depositorName: name,
        createdAt: serverTimestamp(),
      });
      nav(`/my-order/${ref.id}`, { replace: true });
    } catch (e) {
      console.error(e);
      alert('주문 생성 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="checkout-container">
      <header className="checkout-header">
        <button className="back-button" onClick={() => setLeavingAsk(true)} disabled={saving}>
          <img src={backArrow} alt="뒤로가기" className="back-btn-icon" />
        </button>
        <span className="header-title">결제 안내</span>
      </header>

      <div className="checkout-separator" />

      <div className="checkout-body">
        <div className="checkout-card">
          <p className="checkout-text">
            <b>코인 {coins.toLocaleString()}개</b>의 주문이 생성되었습니다.
          </p>
          <p className="checkout-text">
            카카오뱅크 <b>3333-34-7503700</b> 이재원(트위나우) 계좌로{' '}
            <b>{amount.toLocaleString()}원</b>을 입금하실 <b>입금자명</b>을 적고 확인을 눌러 주세요.
          </p>

          <div className="checkout-field">
            <label>입금자명</label>
            <input
              placeholder="입금하실 이름을 입력"
              value={payer}
              onChange={(e) => setPayer(e.target.value)}
              disabled={saving}
            />
          </div>

          <button className="checkout-btn" onClick={handleCreate} disabled={saving}>
            {saving ? '생성 중…' : '확인'}
          </button>
        </div>
      </div>

      {leavingAsk && (
        <>
          <div className="checkout-modal-overlay" onClick={() => setLeavingAsk(false)} />
          <div className="checkout-confirm-modal">
            <p>
              지금 창을 벗어나시면 주문이 생성되지 않습니다.
              <br />
              창을 벗어나시겠습니까?
            </p>
            <div className="checkout-confirm-buttons">
              <button onClick={() => nav(-1)}>네</button>
              <button onClick={() => setLeavingAsk(false)}>아니요</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
