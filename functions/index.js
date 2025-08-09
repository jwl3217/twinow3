// functions/index.js  (CommonJS)
const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const express = require("express");

const app = express();
app.use(express.json());

// 환경변수 (firebase.json에 serviceConfig.environmentVariables로 넣어둔 값 사용)
const {
  PAYACTION_API_KEY,
  PAYACTION_MALL_ID,
  PAYACTION_WEBHOOK_KEY,
  BANK_NAME,
  BANK_ACCOUNT,
  BANK_HOLDER,
} = process.env;

// 1) 헬스체크
app.get("/api/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// 2) 주문 생성 → 페이액션 /order 로 프록시
app.post("/api/payaction/order", async (req, res) => {
  try {
    const { order_number, amount, depositor_name } = req.body || {};

    if (!order_number || !amount || !depositor_name) {
      return res.status(400).json({
        ok: false,
        error: "order_number, amount, depositor_name 모두 필요합니다.",
        got: { order_number, amount, depositor_name },
      });
    }

    // Node 20에선 fetch 내장
    const r = await fetch("https://api.payaction.app/order", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": PAYACTION_API_KEY || "",
        "x-mall-id": PAYACTION_MALL_ID || "",
      },
      body: JSON.stringify({
        order_number,
        amount,
        depositor_name,
      }),
    });

    const text = await r.text(); // 본문 원문 확보
    logger.info("PayAction /order response", {
      status: r.status,
      body: text?.slice?.(0, 1000),
    });

    // 응답 그대로 전달 (JSON이 아니면 텍스트로)
    try {
      const json = JSON.parse(text);
      return res.status(r.status).json(json);
    } catch {
      return res.status(r.status).type("text/plain").send(text);
    }
  } catch (err) {
    logger.error("order proxy error", err);
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
});

// 3) 매칭완료 웹훅 수신 (페이액션 대시보드에 URL 등록)
app.post("/api/payaction/webhook", async (req, res) => {
  const key = req.get("x-webhook-key");
  if (!key || key !== PAYACTION_WEBHOOK_KEY) {
    logger.warn("Webhook rejected: invalid key", { got: key });
    // 재전송 폭주 방지: 200으로 무시 처리
    return res.status(200).json({ status: "ignored" });
  }

  logger.info("Webhook received", {
    headers: {
      "x-mall-id": req.get("x-mall-id"),
      "x-trace-id": req.get("x-trace-id"),
    },
    body: req.body,
  });

  // TODO: 여기서 order_number 등으로 주문 찾고 코인 적립 처리
  return res.json({ status: "success" });
});

// 4) (선택) 페이액션 API 간이 핑
app.get("/api/payaction/ping", async (_req, res) => {
  try {
    const r = await fetch("https://api.payaction.app/order", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": PAYACTION_API_KEY || "",
        "x-mall-id": PAYACTION_MALL_ID || "",
      },
      body: JSON.stringify({}),
    });
    const text = await r.text();
    return res.status(200).json({ status: r.status, body: text?.slice?.(0, 500) });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
});

exports.api = onRequest(
  { region: "asia-northeast3", cors: false, maxInstances: 10 },
  app
);
