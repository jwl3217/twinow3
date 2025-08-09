// functions/index.js  (CommonJS)
const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const express = require("express");

const app = express();
app.use(express.json());

// 디버그 로그
app.use("/api", (req, _res, next) => {
  logger.info("HIT", { method: req.method, path: req.path });
  next();
});

const {
  PAYACTION_API_KEY,
  PAYACTION_MALL_ID,
  PAYACTION_WEBHOOK_KEY,
  BANK_NAME,
  BANK_ACCOUNT,
  BANK_HOLDER,
} = process.env;

// 헬스체크
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// 주문 생성 프록시
app.post("/api/payaction/order", async (req, res) => {
  try {
    const { order_number, amount, depositor_name } = req.body || {};
    if (!order_number || !amount || !depositor_name) {
      return res.status(400).json({
        ok: false,
        error: "order_number, amount, depositor_name 모두 필요",
        got: { order_number, amount, depositor_name },
      });
    }

    const r = await fetch("https://api.payaction.app/order", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": PAYACTION_API_KEY || "",
        "x-mall-id": PAYACTION_MALL_ID || ""
      },
      body: JSON.stringify({ order_number, amount, depositor_name })
    });

    const text = await r.text();
    logger.info("PayAction /order", { status: r.status, body: text?.slice?.(0, 800) });

    try { return res.status(r.status).json(JSON.parse(text)); }
    catch { return res.status(r.status).type("text/plain").send(text); }
  } catch (e) {
    logger.error("order proxy error", e);
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

// 매칭완료 웹훅
app.post("/api/payaction/webhook", (req, res) => {
  const key = req.get("x-webhook-key");
  if (key !== PAYACTION_WEBHOOK_KEY) {
    logger.warn("Webhook rejected", { got: key });
    return res.status(200).json({ status: "ignored" }); // 재전송 폭주 방지
  }
  logger.info("Webhook OK", {
    headers: { "x-mall-id": req.get("x-mall-id"), "x-trace-id": req.get("x-trace-id") },
    body: req.body
  });
  // TODO: order_number 찾아서 코인 적립
  return res.json({ status: "success" });
});

// 라우트 미스
app.use((req, res) => res.status(404).type("text/plain").send(`NO MATCH: ${req.method} ${req.path}`));

exports.api = onRequest({ region: "asia-northeast3", cors: false }, app);
