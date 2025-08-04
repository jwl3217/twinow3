// src/components/PaymentResult.jsx

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate }   from 'react-router-dom';
import { auth, db }                   from '../firebaseConfig';
import { doc, getDoc, updateDoc }     from 'firebase/firestore';

export default function PaymentResult() {
  const { search } = useLocation();
  const navigate   = useNavigate();
  const [status, setStatus] = useState('결제 처리 중...');

  useEffect(() => {
    const params      = new URLSearchParams(search);
    const merchantUid = params.get('merchantUid');
    const tid         = params.get('tid');
    const coinCount   = Number(params.get('amount'));
    if (!merchantUid || !tid) {
      setStatus('결제 정보가 부족합니다.');
      return;
    }
    (async () => {
      try {
        const res = await fetch('/api/pay/approve', {
          method:  'POST',
          headers: {'Content-Type':'application/json'},
          body:    JSON.stringify({merchantUid, tid})
        });
        const result = await res.json();
        if (result.ok) {
          const userRef = doc(db, 'users', auth.currentUser.uid);
          const snap    = await getDoc(userRef);
          const prev    = snap.data()?.coins || 0;
          await updateDoc(userRef, {coins: prev + coinCount});
          setStatus('결제 완료! 코인이 추가되었습니다.');
        } else {
          setStatus('결제 승인 실패: ' + result.error);
        }
      } catch (e) {
        setStatus('서버 통신 오류');
      }
    })();
  }, [search]);

  return (
    <div style={{ padding:20, textAlign:'center' }}>
      <h2>{status}</h2>
      <button onClick={() => navigate('/', {replace:true})}>
        홈으로
      </button>
    </div>
  );
}
