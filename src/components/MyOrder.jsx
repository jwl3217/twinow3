// src/components/MyOrder.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  doc,
  onSnapshot,
  getDoc,
  writeBatch,
  serverTimestamp,
  collection,
  addDoc,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import backArrow from '../assets/back-arrow.png';
import '../styles/MyOrder.css';

// ▼ 관리자 UID 넣어주세요
const ADMIN_UID = '8DRYeKhz3KUBOWp3y1gtI3R86N23';

export default function MyOrder() {
  const { id } = useParams();
  const nav = useNavigate();

  const [order, setOrder] = useState(null);
  const [askCancel, setAskCancel] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);   // FAQ 토글

  // 내가 직접 취소했는지 여부(스냅샷에서 "주문을 찾을 수 없습니다" 경고 방지)
  const canceledByMeRef = useRef(false);

  // 로그인 체크
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (!u) return nav('/', { replace: true });
    });
    return () => unsubAuth();
  }, [nav]);

  // 주문 구독
  useEffect(() => {
    if (!id) return nav('/shop', { replace: true });
    const ref = doc(db, 'order', id);
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) {
        if (canceledByMeRef.current) {
          canceledByMeRef.current = false;
          return;
        }
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
      canceledByMeRef.current = true;
      const orderRef = doc(db, 'order', order.id);
      const snap = await getDoc(orderRef);
      if (!snap.exists()) {
        canceledByMeRef.current = false;
        alert('이미 취소되었거나 존재하지 않습니다.');
        setAskCancel(false);
        return;
      }

      const data = snap.data();
      const canceledRef = doc(db, 'canceledorder', order.id);

      const batch = writeBatch(db);
      batch.set(canceledRef, {
        ...data,
        canceledAt: serverTimestamp()
      });
      batch.delete(orderRef);
      await batch.commit();

      setAskCancel(false);
      alert('주문이 취소되었습니다.');
      nav('/shop', { replace: true });
    } catch (e) {
      console.error(e);
      canceledByMeRef.current = false;
      alert('주문 취소 중 오류가 발생했습니다.');
    }
  };

  // 문의하기(관리자와 1:1 채팅 생성/이동)
  const openSupportChat = async () => {
    const me = auth.currentUser?.uid;
    if (!me) return alert('로그인이 필요합니다.');
    if (!ADMIN_UID || ADMIN_UID === 'YOUR_ADMIN_UID') {
      return alert('ADMIN_UID가 설정되지 않았습니다. 코드 상단을 수정해주세요.');
    }

    try {
      // 내가 속한 채팅방 중, 관리자와의 1:1 방이 있는지 확인
      const roomsQ = query(collection(db, 'chatRooms'), where('members', 'array-contains', me));
      const roomsSnap = await getDocs(roomsQ);
      const exist = roomsSnap.docs.find(d => (d.data().members || []).includes(ADMIN_UID));

      if (exist) {
        return nav(`/chat/${exist.id}`);
      }

      // 없으면 새로 생성
      const newRoom = await addDoc(collection(db, 'chatRooms'), {
        members: [me, ADMIN_UID],
        lastMessage: '고객지원 채팅을 시작했습니다.',
        lastAt: serverTimestamp(),
        unread: { [me]: 0, [ADMIN_UID]: 1 }
      });
      nav(`/chat/${newRoom.id}`);
    } catch (e) {
      console.error(e);
      alert('문의 채팅 생성 중 오류가 발생했습니다.');
    }
  };

  if (!order) return null;

  const isDone = order.orderstate === 'complete';
  const statusText = isDone ? '입금확인 완료' : '입금확인 전';
  const statusClass = isDone ? 'done' : 'pending';

  return (
    <div className="mo-container">
      <header className="mo-header">
        <button className="mo-back-button" onClick={() => nav(-1)}>
          <img src={backArrow} alt="뒤로가기" className="mo-back-btn-icon" />
        </button>
        <span className="mo-header-title">
          나의 주문 <span className={`mo-status-inline ${statusClass}`}>({statusText})</span>
        </span>
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

          {/* 카드 안 상태표시는 제거(헤더로 이동) */}

          <button
            className="mo-cancel-btn"
            onClick={() => setAskCancel(true)}
            disabled={isDone}
            title={isDone ? '완료된 주문은 취소할 수 없습니다.' : undefined}
          >
            주문 취소
          </button>

          {/* 문의하기: 작은 텍스트 링크 스타일 */}
          <button type="button" className="mo-contact-link" onClick={openSupportChat}>
            문의하기
          </button>
        </div>

        {/* ▼ 카드 아래 빈공간을 사용하는 접힘/펼침 FAQ */}
        <div className="mo-faq-wrap">
          <button
            type="button"
            className="mo-faq-toggle"
            onClick={() => setFaqOpen(v => !v)}
            aria-expanded={faqOpen}
          >
            {faqOpen ? '▼ 자주 묻는 질문' : '▶ 자주 묻는 질문'}
          </button>

          {faqOpen && (
            <div className="mo-faq">
              <div className="mo-faq-item">
                <strong>• 입금후 주문을 실수로 취소했어요</strong>
                <p>입금후 주문을 실수로 취소한 경우 환불절차를 따라야 합니다. <b>문의하기</b> 버튼을 클릭해주세요.</p>
              </div>
              <div className="mo-faq-item">
                <strong>• 입금자명 또는 금액을 잘못 적었어요.</strong>
                <p><b>문의하기</b> 버튼을 클릭하신 후 입금하신 입금자명을 말씀해 주세요.</p>
              </div>
              <div className="mo-faq-item">
                <strong>• 환불 문의</strong>
                <p>코인을 일부 사용한 경우 환불이 불가합니다.</p>
              </div>
              <div className="mo-faq-item">
                <strong>• 현금영수증 발행</strong>
                <p><b>문의하기</b> 버튼을 클릭해주세요.</p>
              </div>
            </div>
          )}
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
