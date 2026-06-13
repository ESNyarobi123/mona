import { updateGroceryPackageSchema } from "@monana/types";
import { updatePackage, getPackageById, deletePackage } from "@monana/grocery";
import { handle, ok, parseBody } from "../../../../../lib/api";
import { ApiError, requireAdmin } from "../../../../../lib/auth";

type Params = { params: Promise<{ id: string }> };

export function GET(req: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const pkg = await getPackageById(id);
    if (!pkg) throw new ApiError("Kifurushi hakipatikani", 404);
    const admin = req.headers.get("authorization");
    if (!pkg.active && !admin) throw new ApiError("Kifurushi hakipatikani", 404);
    return ok(pkg);
  });
}

export function PATCH(req: Request, { params }: Params) {
  return handle(async () => {
    requireAdmin(req);
    const { id } = await params;
    const input = await parseBody(req, updateGroceryPackageSchema);
    return ok(await updatePackage(id, input));
  });
}

export function DELETE(req: Request, { params }: Params) {
  return handle(async () => {
    requireAdmin(req);
    const { id } = await params;
    return ok(await deletePackage(id));
  });
}
