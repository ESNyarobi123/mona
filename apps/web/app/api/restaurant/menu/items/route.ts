import { menuItemSchema } from "@monana/types";
import { createMenuItem } from "@monana/restaurant";
import { handle, ok, parseBody } from "../../../../../lib/api";
import { requireAdmin } from "../../../../../lib/auth";

// POST /api/restaurant/menu/items (admin)
export function POST(req: Request) {
  return handle(async () => {
    requireAdmin(req);
    const input = await parseBody(req, menuItemSchema);
    return ok(await createMenuItem(input), 201);
  });
}
