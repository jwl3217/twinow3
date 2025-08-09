/* src/components/PayactionOrder.jsx */
import { useEffect, useState } from "react";
import { auth, db } from "../firebaseConfig";
import { doc, onSnapshot } from "firebase/firestore";

export default function PayactionOrder({ amount, depositorName }) {
  const [merchantUid, setMerchantUid] = useState("");
  const [bankInfo, setBankInfo] = useState(null);
  const [status, setStatus] = useState("");

  const createOrder = async () => {
    const user = auth.currentUser;
    if (!user) { alert("로그인이 필요합니다."); return; }

    const uid = `TW-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
    setMerchantUid(uid);

    const res = await fetch("/api/order", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({
        merchantUid: uid,
        amount: Number(amount),
        depositorName,
        userId: user.uid,
        buyerEmail: user.email || "",
        buyerPhone: user.phoneNumber || ""
      })
    });
    const json = await res.json();
    if (!json.success) { alert(json.error || "주문 실패"); return; }

    setBankInfo(json.order.bankInfo);
    setStatus(json.order.status);
  };

  // 실시간 상태 추적
  useEffect(() => {
    if (!merchantUid) return;
    const unsub = onSnapshot(doc(db, "payments", merchantUid), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setStatus(d.status);
      }
    });
    return () => unsub();
  }, [merchantUid]);

  return (
    <div>
      <button onClick={createOrder}>주문 생성</button>
      {bankInfo && (
        <div style={{marginTop:16}}>
          <div>은행: {bankInfo.bankName}</div>
          <div>계좌: {bankInfo.accountNumber}</div>
          <div>예금주: {bankInfo.accountHolder}</div>
          <div>결제금액: {Number(amount).toLocaleString()}원</div>
          <div>입금자명: {depositorName}</div>
          <div>상태: {status}</div>
        </div>
      )}
    </div>
  );
}
