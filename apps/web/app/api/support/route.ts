import { getPlatformSettings } from "@monana/settings";
import { getBotShowcase } from "../../../lib/bot-showcase";
import { handle, ok } from "../../../lib/api";

/** GET /api/support — public help info (Lipa Namba, WhatsApp) */
export function GET() {
  return handle(async () => {
    const [settings, showcase] = await Promise.all([
      getPlatformSettings(),
      getBotShowcase("sw"),
    ]);

    const lipa = settings.lipaNamba?.trim() || process.env.LIPA_NAMBA || "";
    const lipaName = settings.lipaNambaName?.trim() || process.env.LIPA_NAMBA_NAME || "MONANA";

    return ok({
      lipaNamba: lipa && !lipa.includes("XXXX") ? lipa : null,
      lipaNambaName: lipaName,
      whatsappUrl: showcase.whatsappUrl,
      phoneDisplay: showcase.phoneDisplay,
      botConnected: showcase.connected,
    });
  });
}
