// functions/index.js
const { onRequest } = require("firebase-functions/v2/https");
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

admin.initializeApp();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// 환경변수 (firebase.json 의 functions.serviceConfig.environmentVariables 로 주입)
const {
  PAYACTION_API_KEY,
  PAYACTION_MALL_ID,
  PAYACTION_WEBHOOK_KEY,
  BANK_NAME,
  BANK_ACCOUNT,
  BANK_HOLDER,
} = process.env;

// 유틸: 주문번호 생성
function genOrderNo() {
  const ts = Date.now();
  const rand = Math.floor(Math.random() * 1e6).toString().padStart(6, "0");
  return `ORD-${ts}-${rand}`;
}

/**
 * 1) 주문 생성: 프론트에서 (코인수, 금액, 입금자명, uid) 전달
 *    - Firestore에 coinOrders 문서 생성 (PENDING)
 *    - 페이액션 /order 호출 (헤더: x-api-key, x-mall-id)
 *    - 프론트로 order_number 반환
 */
app.post("/api/payaction/order", async (req, res) => {
  try {
    const { uid, coins, amount, depositorName } = req.body || {};
    if (!uid)            return res.status(400).json({ ok: false, error: "uid required" });
    if (!coins)          return res.status(400).json({ ok: false, error: "coins required" });
    if (!amount)         return res.status(400).json({ ok: false, error: "amount required" });
    if (!depositorName)  return res.status(400).json({ ok: false, error: "depositorName required" });

    const order_number = genOrderNo();

    // 1) 우리 DB에 먼저 저장
    const db = admin.firestore();
    await db.collection("coinOrders").doc(order_number).set({
      order_number,
      uid,
      coins,
      amount,             // KRW
      depositorName,
      bank: {
        name: BANK_NAME || "하나은행",
        account: BANK_ACCOUNT || "",
        holder: BANK_HOLDER || "",
      },
      status: "PENDING",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 2) 페이액션 주문 생성
    //    문서가 공개가 아니어서 필드명이 케이스마다 조금 다를 수 있습니다.
    //    아래 payload는 "금액 + 입금자명 + 주문번호"를 기본으로 보냅니다.
    const payload = {
      order_number,                 // 주문 고유번호
      amount,                       // 결제(입금) 금액(원)
      depositor: depositorName,     // 입금자명
      // description: "TwiNow 코인 충전", // 선택
    };

    const r = await fetch("https://api.payaction.app/order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": PAYACTION_API_KEY,
        "x-mall-id": PAYACTION_MALL_ID,
      },
      body: JSON.stringify(payload),
    });

    // 페이액션 응답은 상황에 따라 다를 수 있으니 로깅만 하고 계속 진행
    const text = await r.text();
    console.log("PayAction /order response:", r.status, text);

    // 에러여도 우리 쪽 안내 페이지로 이동해서 입금 유도 → 웹훅으로 최종정산
    return res.json({ ok: true, order_number });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: "server_error" });
  }
});

/**
 * 2) 페이액션 웹훅
 *    - 헤더 인증: x-webhook-key, x-mall-id
 *    - body에서 order_number가 오면 그걸로, 없으면 (입금액+입금자명)으로 최근 PENDING 주문 매칭
 *    - 주문을 PAID로 바꾸고, users/{uid}.coins 증가
 *    - 200에 {status:'success'} 반환(중요)
 */
app.post("/api/payaction/webhook", async (req, res) => {
  try {
    const recvWebhookKey = req.header("x-webhook-key");
    const recvMallId     = req.header("x-mall-id");

    if (recvWebhookKey !== PAYACTION_WEBHOOK_KEY || recvMallId !== PAYACTION_MALL_ID) {
      return res.status(401).json({ status: "unauthorized" });
    }

    const db = admin.firestore();
    const data = req.body || {};
    console.log("Webhook body:", JSON.stringify(data));

    // 페이액션 바디 구조가 케이스별로 다를 수 있어 안전하게 읽기
    const orderNo =
      data.order_number || data.orderNo || data.orderId || null;
    const depositor =
      data.depositor || data.depositor_name || data.payer_name || null;
    const amount =
      Number(data.amount || data.price || data.order_amount || 0);

    let orderSnap = null;

    if (orderNo) {
      orderSnap = await db.collection("coinOrders").doc(orderNo).get();
    } else if (depositor && amount) {
      // 최근 3일 내 PENDING 주문 중에서 (입금자명+금액) 일치건 탐색
      const threeDaysAgo = admin.firestore.Timestamp.fromDate(
        new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      );
      const q = await db
        .collection("coinOrders")
        .where("status", "==", "PENDING")
        .where("depositorName", "==", depositor)
        .where("amount", "==", amount)
        .where("createdAt", ">", threeDaysAgo)
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();
      if (!q.empty) orderSnap = q.docs[0];
    }

    if (!orderSnap || !orderSnap.exists) {
      console.warn("No matching order found for webhook.");
      // 그래도 성공 응답을 내려야 페이액션 재전송 폭주가 안 생깁니다.
      return res.status(200).json({ status: "success" });
    }

    const order = orderSnap.data();
    if (order.status === "PAID") {
      return res.status(200).json({ status: "success" });
    }

    // 1) 주문 상태 업데이트
    await orderSnap.ref.update({
      status: "PAID",
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      payactionWebhook: data,
    });

    // 2) 코인 적립
    await db.collection("users").doc(order.uid).update({
      coins: admin.firestore.FieldValue.increment(order.coins),
    });

    return res.status(200).json({ status: "success" }); // ← 반드시 {status:'success'}
  } catch (err) {
    console.error("webhook error:", err);
    // 실패로 응답하면 페이액션이 재전송합니다.
    return res.status(500).json({ status: "fail" });
  }
});

// Functions v2 배포
exports.api = onRequest(
  { region: "asia-northeast3", cors: true },
  app
);
