import { groceryPackageSchema } from "@monana/types";
import { listPackages, listAllPackages, createPackage } from "@monana/grocery";
import { handle, ok, parseBody } from "../../../../lib/api";
import { requireAdmin } from "../../../../lib/auth";

export function GET(req: Request) {
  return handle(async () => {
    if (new URL(req.url).searchParams.get("all") === "1") {
      requireAdmin(req);
      return ok(await listAllPackages());
    }
    return ok(await listPackages());
  });
}

export function POST(req: Request) {
  return handle(async () => {
    requireAdmin(req);
    const input = await parseBody(req, groceryPackageSchema);
    return ok(await createPackage(input), 201);
  });
}
