import { toggleHotPickSchema } from "@monana/types";
import { setMenuItemHotStatus, setProductHotStatus } from "@monana/hot-products";
import { handle, ok, parseBody } from "../../../../../lib/api";
import { requireAdmin } from "../../../../../lib/auth";

/** POST /api/admin/hot-products/toggle — mark or unmark item as hot pick */
export function POST(req: Request) {
  return handle(async () => {
    requireAdmin(req);
    const input = await parseBody(req, toggleHotPickSchema);

    if (input.module === "GROCERY") {
      const pick = await setProductHotStatus(input.productId!, input.hot, input.badge ?? "🔥 Hot");
      return ok({ hot: input.hot, pick });
    }

    const pick = await setMenuItemHotStatus(input.menuItemId!, input.hot, input.badge ?? "🔥 Hot");
    return ok({ hot: input.hot, pick });
  });
}
