import { getGroceryStoreHome } from "@monana/grocery";
import { parseLocale } from "@monana/i18n";
import { handle, ok } from "../../../../../lib/api";
import { ApiError, requireSelfAdminOrBot } from "../../../../../lib/auth";

/** GET /api/grocery/store/home?userId=&locale= — bot grocery hub (packages + subscription state) */
export function GET(req: Request) {
  return handle(async () => {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    if (!userId) throw new ApiError("userId inahitajika", 400);
    requireSelfAdminOrBot(req, userId);
    const locale = parseLocale(url.searchParams.get("locale"));
    return ok(await getGroceryStoreHome(userId, locale));
  });
}
