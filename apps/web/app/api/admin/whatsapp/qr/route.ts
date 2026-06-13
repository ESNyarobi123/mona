import { fetchBotQr } from "../../../../../lib/bot-client";
import { handle, ok } from "../../../../../lib/api";
import { requireAdmin } from "../../../../../lib/auth";

export function GET(req: Request) {
  return handle(async () => {
    requireAdmin(req);
    const data = await fetchBotQr();
    if (!data) {
      return ok({ qr: null, dataUrl: null, message: "Bot haijafunguka — endesha npm run dev:bot" });
    }
    return ok(data);
  });
}
