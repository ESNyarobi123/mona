import { getOnDemandCatalog } from "@monana/grocery";
import { handle, ok } from "../../../../../lib/api";

/** Orodha ya bidhaa kwa oda ya papo kwa papo */
export function GET(req: Request) {
  return handle(async () => {
    const categoryId = new URL(req.url).searchParams.get("categoryId") ?? undefined;
    return ok(await getOnDemandCatalog(categoryId));
  });
}
