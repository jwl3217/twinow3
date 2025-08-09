// src/components/MyOrder.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  doc,
  onSnapshot,
  getDoc,
  writeBatch,
  serverTimestamp // ★ 추가
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import backArrow from '../assets/back-arrow.png';
import '../styles/MyOrder.css';

export default function MyOrder() {
  const { id } = useParams();
  const nav = useNavigate();

  const [order, setOrder] = useState(null);
  const [askCancel, setAskCancel] = useState(false);

  // 로그인 체크
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (!u) return nav('/', { replace: true });
    });
    return () => unsubAuth();
  }, [nav]);

  // BottomNav 숨김
  useEffect(() => {
    const b = document.querySelector('.bottom-nav');
    if (b) b.style.display = 'none';
    return () => { if (b) b.style.display = ''; };
  }, []);

  // 주문 구독
  useEffect(() => {
    if (!id) return nav('/shop', { replace: true });
    const ref = doc(db, 'order', id);
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) {
        alert('주문을 찾을 수 없습니다.');
        return nav('/shop', { replace: true });
      }
      const d = snap.data();
      const u = auth.currentUser;
      if (!u || d.uid !== u.uid) {
        alert('접근 권한이 없습니다.');
        return nav('/shop', { replace: true });
      }
      setOrder({ id: snap.id, ...d });
    });
    return () => unsub();
  }, [id, nav]);

  // 주문 취소: order/<id> → canceledorder/<id> + canceledAt
  const cancelOrder = async () => {
    if (!order) return;
    try {
      const orderRef = doc(db, 'order', order.id);
      const snap = await getDoc(orderRef);
      if (!snap.exists()) {
        alert('이미 취소되었거나 존재하지 않습니다.');
        setAskCancel(false);
        return;
      }

      const data = snap.data();
      const canceledRef = doc(db, 'canceledorder', order.id);

      const batch = writeBatch(db);
      batch.set(canceledRef, {
        ...data,
        canceledAt: serverTimestamp() // ★ 취소 시간 기록
      });
      batch.delete(orderRef);
      await batch.commit();

      setAskCancel(false);
      nav('/shop', { replace: true });
    } catch (e) {
      console.error(e);
      alert('주문 취소 중 오류가 발생했습니다.');
    }
  };

  if (!order) return null;

  const statusText  = order.orderstate === 'complete' ? '입금확인 완료' : '입금확인 전';
  const statusClass = order.orderstate === 'complete' ? 'done' : 'pending';

  return (
    <div className="mo-container">
      <header className="mo-header">
        <button className="mo-back-button" onClick={() => nav(-1)}>
          <img src={backArrow} alt="뒤로가기" className="mo-back-btn-icon" />
        </button>
        <span className="mo-header-title">나의 주문</span>
      </header>

      <div className="mo-separator" />

      <div className="mo-body">
        <div className="mo-card">
          <p className="mo-text">
            카카오뱅크 <b>3333-34-7503700</b> 이재원(트위나우)
          </p>
          <p className="mo-text">
            계좌로 <b>{order.amount.toLocaleString()}원</b>을 입금해주세요.
          </p>
          <p className="mo-text">
            입금자명이 정확히 <b>{order.depositorName}</b>이어야 합니다.
          </p>
          <p className="mo-text">
            입금 후 24시간 이내에 코인 <b>{order.coins.toLocaleString()}개</b>가 충전됩니다.
          </p>

          <div className={`mo-status ${statusClass}`}>{statusText}</div>

          <button
            className="mo-cancel-btn"
            onClick={() => setAskCancel(true)}
            disabled={order.orderstate === 'complete'}
            title={order.orderstate === 'complete' ? '완료된 주문은 취소할 수 없습니다.' : undefined}
          >
            주문 취소
          </button>
        </div>
      </div>

      {askCancel && (
        <>
          <div className="mo-modal-overlay" onClick={() => setAskCancel(false)} />
          <div className="mo-confirm-modal">
            <p>주문을 취소하시겠습니까?</p>
            <div className="mo-confirm-buttons">
              <button onClick={cancelOrder}>예</button>
              <button onClick={() => setAskCancel(false)}>아니요</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
