import { updateMenuSchema } from "@monana/types";
import { updateMenu } from "@monana/restaurant";
import { prisma } from "@monana/db";
import { handle, ok, parseBody } from "../../../../../lib/api";
import { ApiError, requireAdmin } from "../../../../../lib/auth";

type Params = { params: Promise<{ id: string }> };

export function GET(req: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const menu = await prisma.menu.findUnique({
      where: { id },
      include: { items: { include: { category: true } } },
    });
    if (!menu) throw new ApiError("Menyu haipatikani", 404);
    return ok(menu);
  });
}

export function PATCH(req: Request, { params }: Params) {
  return handle(async () => {
    requireAdmin(req);
    const { id } = await params;
    const input = await parseBody(req, updateMenuSchema);
    return ok(await updateMenu(id, input));
  });
}
