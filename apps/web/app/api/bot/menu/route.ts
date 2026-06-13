import { getBotContent } from "@monana/bot-content";
import { parseLocale } from "@monana/i18n";
import { handle, ok } from "../../../../lib/api";

/** Bot menu + copy — English default, ?locale=sw for Swahili */
export function GET(req: Request) {
  return handle(async () => {
    const locale = parseLocale(new URL(req.url).searchParams.get("locale"));
    return ok(getBotContent(locale));
  });
}
