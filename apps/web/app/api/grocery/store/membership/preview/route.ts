import { membershipPreviewSchema } from "@monana/types";
import { previewMembershipBasket } from "@monana/grocery";
import { parseLocale } from "@monana/i18n";
import { handle, ok, parseBody } from "../../../../../../lib/api";

/** Hakiki bei ya kikapu kabla ya kujisajili */
export function POST(req: Request) {
  return handle(async () => {
    const locale = parseLocale(new URL(req.url).searchParams.get("locale"));
    const input = await parseBody(req, membershipPreviewSchema);
    return ok(await previewMembershipBasket(input.plan, input.defaultBasket, locale, input.packageId));
  });
}
