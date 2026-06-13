import { listMenus, listMenuItems, listAllMenuItems, listAllMenus, createMenu } from "@monana/restaurant";
import { mealSlotSchema, menuSchema } from "@monana/types";
import { handle, ok, parseBody } from "../../../../lib/api";
import { requireAdmin } from "../../../../lib/auth";

// GET /api/restaurant/menu?slot= | ?all=1 (admin)
export function GET(req: Request) {
  return handle(async () => {
    const url = new URL(req.url);
    if (url.searchParams.get("all") === "1") {
      requireAdmin(req);
      return ok({ menus: await listAllMenus(), items: await listAllMenuItems() });
    }
    const slot = url.searchParams.get("slot");
    if (slot) {
      const parsed = mealSlotSchema.safeParse(slot);
      if (parsed.success) return ok(await listMenuItems(parsed.data));
    }
    return ok(await listMenus());
  });
}

// POST /api/restaurant/menu — create menu (admin)
export function POST(req: Request) {
  return handle(async () => {
    requireAdmin(req);
    const input = await parseBody(req, menuSchema);
    return ok(await createMenu(input), 201);
  });
}
