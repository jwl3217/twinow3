import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

// 간단 헬스체크
export const api = onRequest({ region: "asia-northeast3" }, async (req, res) => {
  const path = req.path || req.url || "/";
  if (path === "/health") {
    return res.json({ ok: true, time: new Date().toISOString() });
  }

  // 여기에 /payaction/order 등 라우팅을 붙여갈 수 있음
  return res.status(404).json({ ok: false, error: "not_found", path });
});
