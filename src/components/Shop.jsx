/* src/components/Shop.jsx */
import React, { useEffect, useState } from 'react';
import { auth, db } from '../firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';

export default function Shop() {
  const [amount, setAmount] = useState('');
  const [depositorName, setDepositorName] = useState('');
  const [creating, setCreating] = useState(false);

  const [merchantUid, setMerchantUid] = useState('');
  const [bankInfo, setBankInfo] = useState(null);
  const [status, setStatus] = useState('');

  const createOrder = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) { alert('로그인이 필요합니다.'); return; }
    if (!amount || !depositorName) { alert('금액과 입금자명을 입력해주세요.'); return; }

    try {
      setCreating(true);
      const uid = `TW-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;

      const res = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({
          merchantUid: uid,
          amount: Number(amount),
          depositorName: depositorName.trim(),
          userId: user.uid,
          buyerEmail: user.email || '',
          buyerPhone: user.phoneNumber || ''
        })
      });
      const json = await res.json();
      if (!json.success) {
        console.error(json);
        alert(json.error || '주문 생성 실패');
        return;
      }

      setMerchantUid(uid);
      setStatus(json.order.status);
      setBankInfo(json.order.bankInfo);
    } catch (err) {
      console.error(err);
      alert('서버 오류로 주문 생성에 실패했습니다.');
    } finally {
      setCreating(false);
    }
  };

  // 결제 상태 실시간 모니터링
  useEffect(() => {
    if (!merchantUid) return;
    const unsub = onSnapshot(doc(db, 'payments', merchantUid), (snap) => {
      if (snap.exists()) {
        setStatus(snap.data().status || '');
      }
    });
    return () => unsub();
  }, [merchantUid]);

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: 16 }}>
      <h2>코인 구매</h2>

      <form onSubmit={createOrder} style={{ display:'grid', gap:12 }}>
        <label>
          결제 금액(원)
          <input
            type="number"
            min={1000}
            step={100}
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="예: 10000"
            required
          />
        </label>
        <label>
          입금자명
          <input
            type="text"
            value={depositorName}
            onChange={e => setDepositorName(e.target.value)}
            placeholder="예: 홍길동"
            required
          />
        </label>
        <button type="submit" disabled={creating}>
          {creating ? '주문 생성 중…' : '주문 생성'}
        </button>
      </form>

      {bankInfo && (
        <div style={{ marginTop: 24, padding: 16, border:'1px solid #eee', borderRadius:8 }}>
          <h3>입금 안내</h3>
          <p><b>주문번호</b>: {merchantUid}</p>
          <p><b>은행</b>: {bankInfo.bankName || '-'}</p>
          <p><b>계좌번호</b>: {bankInfo.accountNumber || '-'}</p>
          <p><b>예금주</b>: {bankInfo.accountHolder || '-'}</p>
          <p><b>입금자명</b>: {depositorName}</p>
          <p><b>결제금액</b>: {Number(amount).toLocaleString()}원</p>
          <p><b>상태</b>: {status || 'pending'}</p>
          <small>입금 후 1~2분 내 자동으로 확인됩니다.</small>
        </div>
      )}
    </div>
  );
}
