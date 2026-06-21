import { getOnDemandCatalog } from "@monana/grocery";
import { parseLocale } from "@monana/i18n";
import { handle, ok } from "../../../../../lib/api";

/** Orodha ya bidhaa kwa oda ya papo kwa papo */
export function GET(req: Request) {
  return handle(async () => {
    const url = new URL(req.url);
    const categoryId = url.searchParams.get("categoryId") ?? undefined;
    const locale = parseLocale(url.searchParams.get("locale"));
    return ok(await getOnDemandCatalog(categoryId, locale));
  });
}
