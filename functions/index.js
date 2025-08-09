const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const express = require("express");

// --- Firebase Admin 초기화 ---
try { admin.app(); } catch { admin.initializeApp(); }
const db = admin.firestore();

// --- PayAction 설정 (요청하신 값) ---
const PAYACTION_API_KEY     = "ZDSK7NP8TSBN";
const PAYACTION_MALL_ID     = "1754495682975x949667080623358000";
const PAYACTION_WEBHOOK_KEY = "N3HQX68KSTY9";

// (입금 계좌 안내용)
const BANK = { name: "하나은행", account: "31191046973307", holder: "이재원" };

// --- Express 앱 ---
const app = express();
app.use(express.json());

// 유틸: 두 경로 다 매핑하는 헬퍼
const mapPaths = (paths, handler, method = "get") => {
  paths.forEach(p => app[method](p, handler));
};

// 헬스체크 (리라이트 확인용)
// /health 와 /api/health 둘 다 응답
mapPaths(
  ["/health", "/api/health"],
  (req, res) => res.json({ ok: true, time: new Date().toISOString() }),
  "get"
);

// 주문 생성: /payaction/order 와 /api/payaction/order 모두 처리
// body: { uid, coins, amount, depositorName }
mapPaths(
  ["/payaction/order", "/api/payaction/order"],
  async (req, res) => {
    try {
      const { uid, coins, amount, depositorName } = req.body || {};
      if (!uid || !coins || !amount || !depositorName) {
        return res.status(400).json({ ok: false, error: "missing_params" });
      }

      // 주문번호 생성
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

      // 1) Firestore에 주문 저장(대기)
      const orderDoc = {
        order_number: orderNumber,
        uid,
        coins,
        amount,
        depositor_name: depositorName,
        status: "pending",
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };
      await db.collection("orders").doc(orderNumber).set(orderDoc);

      // 2) PayAction 주문 API 호출
      const resp = await fetch("https://api.payaction.app/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": PAYACTION_API_KEY,
          "x-mall-id": PAYACTION_MALL_ID
        },
        body: JSON.stringify({
          order_number: orderNumber,
          amount: Number(amount),
          depositor_name: depositorName
        })
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        await db.collection("orders").doc(orderNumber).update({
          status: "payaction_error",
          payaction_status: resp.status,
          payaction_body: text
        });
        return res.status(502).json({ ok: false, error: "payaction_failed" });
      }

      await db.collection("orders").doc(orderNumber).update({
        status: "registered"
      });

      return res.json({ ok: true, order_number: orderNumber });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ ok: false, error: "server_error" });
    }
  },
  "post"
);

// PayAction 웹훅: /payaction/webhook 와 /api/payaction/webhook 둘 다 처리
mapPaths(
  ["/payaction/webhook", "/api/payaction/webhook"],
  async (req, res) => {
    try {
      const hdrKey  = req.get("x-webhook-key");
      const hdrMall = req.get("x-mall-id");

      if (hdrKey !== PAYACTION_WEBHOOK_KEY || hdrMall !== PAYACTION_MALL_ID) {
        return res.status(401).json({ status: "invalid" });
      }

      const payload = req.body || {};
      // 페이액션이 보내주는 주문 식별자 필드명 후보
      const orderNumber =
        payload.order_number || payload.orderNo || payload.orderId;

      if (!orderNumber) {
        // 식별자 없으면 수신 OK만 반환(재전송 방지)
        return res.status(200).json({ status: "success" });
      }

      const snap = await db.collection("orders").doc(orderNumber).get();
      if (!snap.exists) {
        return res.status(200).json({ status: "success" });
      }

      const order = snap.data();
      if (order.status === "completed") {
        return res.status(200).json({ status: "success" });
      }

      const userRef = db.collection("users").doc(order.uid);
      await db.runTransaction(async (tx) => {
        const us = await tx.get(userRef);
        const cur = us.exists ? us.data().coins || 0 : 0;
        tx.update(userRef, { coins: cur + Number(order.coins || 0) });
        tx.update(snap.ref, {
          status: "completed",
          completedAt: admin.firestore.FieldValue.serverTimestamp(),
          webhook_trace_id: req.get("x-trace-id") || null
        });
      });

      return res.status(200).json({ status: "success" });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ status: "error" });
    }
  },
  "post"
);

// Cloud Function export
exports.api = onRequest(
  { region: "asia-northeast3", timeoutSeconds: 30, memory: "256MiB" },
  app
);
