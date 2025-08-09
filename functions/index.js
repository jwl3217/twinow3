// functions/index.js
// ESM(모듈) 문법입니다. functions/package.json 에 "type": "module" 이 설정되어 있어야 합니다.
// Firebase Functions v2 + Express

import express from "express";
import { onRequest } from "firebase-functions/v2/https";

// ────────────────────────────────────────────────────────────
// 환경변수 (Firebase 콘솔 → Functions 환경변수, 또는 .env 설정)
// PAYACTION_API_KEY, PAYACTION_MALL_ID, PAYACTION_WEBHOOK_KEY 필수
// ────────────────────────────────────────────────────────────
const {
  PAYACTION_API_KEY = "",
  PAYACTION_MALL_ID = "",
  PAYACTION_WEBHOOK_KEY = "",
} = process.env;

// Express 앱 준비
const app = express();

// JSON 파서 (이게 없으면 req.body 가 비어 들어와서 "누락된 필드" 오류가 납니다!)
app.use(express.json({ limit: "2mb" }));

// 헬스체크
app.get("/api/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// 주문 생성 프록시: /api/payaction/order
app.post("/api/payaction/order", async (req, res) => {
  try {
    // 혹시 모를 경우(문자열로 들어온 경우) 방어 파싱
    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch { body = {}; }
    }

    const order_number   = body?.order_number;
    const amount         = body?.amount;
    const depositor_name = body?.depositor_name;

    if (!order_number || typeof order_number !== "string") {
      return res.status(400).json({ status: "error", response: { message: "누락된 필드가 존재합니다. (order_number)" } });
    }
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ status: "error", response: { message: "누락된 필드가 존재합니다. (amount)" } });
    }
    if (!depositor_name || typeof depositor_name !== "string") {
      return res.status(400).json({ status: "error", response: { message: "누락된 필드가 존재합니다. (depositor_name)" } });
    }

    if (!PAYACTION_API_KEY || !PAYACTION_MALL_ID) {
      return res.status(500).json({ status: "error", response: { message: "서버 환경변수(PAYACTION_API_KEY / PAYACTION_MALL_ID)가 설정되지 않았습니다." } });
    }

    // Node 18+ 에서는 global fetch 사용 가능 (별도 node-fetch 설치 불필요)
    const r = await fetch("https://api.payaction.app/order", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": PAYACTION_API_KEY,
        "x-mall-id": PAYACTION_MALL_ID,
      },
      body: JSON.stringify({
        order_number,
        amount: Number(amount),
        depositor_name,
        // 필요 시 표시용 이름을 추가하고 싶다면 아래 주석 해제
        // order_name: `코인 주문 (${Number(amount).toLocaleString()}원)`,
      }),
    });

    const text = await r.text();
    let data = null;
    try { data = JSON.parse(text); } catch { /* not json */ }

    if (!r.ok) {
      // 페이액션 에러 그대로 전달
      return res.status(r.status).json({
        status: "error",
        response: data || { message: text || "PAYACTION_ERROR" },
      });
    }

    return res.json({ status: "ok", response: data || { ok: true } });
  } catch (e) {
    console.error("[payaction/order] error:", e);
    return res.status(500).json({ status: "error", response: { message: String(e) } });
  }
});

// 매칭 완료 웹훅 수신: /api/payaction/webhook
app.post("/api/payaction/webhook", async (req, res) => {
  try {
    // 키 검증
    const webhookKey = req.header("x-webhook-key");
    const mallId     = req.header("x-mall-id");

    if (!PAYACTION_WEBHOOK_KEY || !PAYACTION_MALL_ID) {
      return res.status(500).json({ status: "error", response: { message: "서버 환경변수(PAYACTION_WEBHOOK_KEY / PAYACTION_MALL_ID)가 설정되지 않았습니다." } });
    }
    if (webhookKey !== PAYACTION_WEBHOOK_KEY || mallId !== PAYACTION_MALL_ID) {
      console.warn("[webhook] invalid header", { webhookKey, mallId });
      return res.status(401).json({ status: "error", response: { message: "unauthorized" } });
    }

    // 웹훅 페이로드 로깅 (필요시 DB 처리)
    const payload = typeof req.body === "string" ? safeParse(req.body) : req.body;
    console.log("[webhook] payload:", JSON.stringify(payload));

    // TODO: 여기서 payload.order_number 등을 바탕으로
    //       해당 주문의 유저에게 코인 충전 처리 로직을 추가하세요.

    // 페이액션 요구 응답: 200 + {"status":"success"}
    return res.json({ status: "success" });
  } catch (e) {
    console.error("[webhook] error:", e);
    // 실패로 응답하면 페이액션이 재시도합니다(최대 3회)
    return res.status(500).json({ status: "error", response: { message: String(e) } });
  }
});

// 유틸: 안전 파싱
function safeParse(t) {
  try { return JSON.parse(t); } catch { return {}; }
}

// Firebase Functions export
export const api = onRequest({ cors: true }, app);
