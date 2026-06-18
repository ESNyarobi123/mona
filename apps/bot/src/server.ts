import express from "express";
import QRCode from "qrcode";
import { sendText } from "./connection/whatsapp";
import { getBotState } from "./connection/bot-state";
import { patchSession } from "./services/session.service";

export function startHttpServer(port = Number(process.env.BOT_PORT ?? 4000)) {
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.get("/status", (_req, res) => {
    res.json({ success: true, data: getBotState() });
  });

  app.get("/qr", async (_req, res) => {
    const data = getBotState();
    if (!data.qr) {
      return res.json({
        success: true,
        data: { qr: null, dataUrl: null, message: data.connected ? "Imeshatenganishwa" : "Hakuna QR kwa sasa" },
      });
    }
    try {
      const dataUrl = await QRCode.toDataURL(data.qr, { width: 280, margin: 2 });
      res.json({ success: true, data: { qr: data.qr, dataUrl } });
    } catch (err) {
      const message = err instanceof Error ? err.message : "QR imeshindwa";
      res.status(500).json({ success: false, error: message });
    }
  });

  app.post("/send", async (req, res) => {
    const { phone, text } = req.body ?? {};
    if (!phone || !text) {
      return res.status(400).json({ success: false, error: "phone na text vinahitajika" });
    }
    try {
      await sendText(phone, text);
      res.json({ success: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "imeshindikana";
      res.status(503).json({ success: false, error: message });
    }
  });

  /** Prime session so member can reply with menu item numbers after slot-open reminder. */
  app.post("/membership-reminder", async (req, res) => {
    const { phone, text, userId, mealSlot, menuItems } = req.body ?? {};
    if (!phone || !text || !mealSlot || !Array.isArray(menuItems)) {
      return res.status(400).json({ success: false, error: "phone, text, mealSlot, menuItems vinahitajika" });
    }
    try {
      patchSession(phone, "CHOOSING", {
        module: "RESTAURANT",
        mealSlot,
        menuItems,
        cart: [],
        userId,
        membershipMode: false,
      });
      await sendText(phone, text);
      res.json({ success: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "imeshindikana";
      res.status(503).json({ success: false, error: message });
    }
  });

  app.listen(port, () => console.log(`[bot] HTTP bridge http://localhost:${port}`));
}
