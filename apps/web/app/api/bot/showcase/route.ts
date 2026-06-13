import { getBotShowcase } from "../../../../lib/bot-showcase";
import { parseLocale } from "@monana/i18n";
import { handle, ok } from "../../../../lib/api";

/** GET /api/bot/showcase — landing: linked WhatsApp number, menu preview, payment info */
export function GET(req: Request) {
  return handle(async () => {
    const locale = parseLocale(new URL(req.url).searchParams.get("locale"));
    return ok(await getBotShowcase(locale));
  });
}
