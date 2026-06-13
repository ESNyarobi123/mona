import { platformSettingsSchema } from "@monana/types";
import { getPlatformSettings, updatePlatformSettings } from "@monana/settings";
import { fetchBotHealth, fetchBotStatus } from "../../../../lib/bot-client";
import { handle, ok, parseBody } from "../../../../lib/api";
import { requireAdmin } from "../../../../lib/auth";

// GET /api/admin/settings — platform settings + bot status
export function GET(req: Request) {
  return handle(async () => {
    requireAdmin(req);
    const settings = await getPlatformSettings();
    const botOnline = await fetchBotHealth();
    const botStatus = botOnline ? await fetchBotStatus() : null;
    return ok({ settings, bot: { online: botOnline, status: botStatus } });
  });
}

// PATCH /api/admin/settings — admin number, Lipa Namba
export function PATCH(req: Request) {
  return handle(async () => {
    requireAdmin(req);
    const input = await parseBody(req, platformSettingsSchema);
    const settings = await updatePlatformSettings(input);
    return ok(settings);
  });
}
