import { createCateringPackage, listCateringPackages } from "@monana/catering";
import { upsertCateringPackageSchema } from "@monana/types";
import { handle, ok, parseBody } from "../../../../lib/api";
import { requireAdmin } from "../../../../lib/auth";

// GET /api/catering/packages — public active packages (admin: ?all=1)
export function GET(req: Request) {
  return handle(async () => {
    const all = new URL(req.url).searchParams.get("all") === "1";
    if (all) requireAdmin(req);
    return ok(await listCateringPackages({ activeOnly: !all }));
  });
}

// POST /api/catering/packages — admin create
export function POST(req: Request) {
  return handle(async () => {
    requireAdmin(req);
    const input = await parseBody(req, upsertCateringPackageSchema);
    return ok(
      await createCateringPackage({
        ...input,
        featuresEn: input.featuresEn ?? [],
        featuresSw: input.featuresSw ?? [],
        imageUrl: input.imageUrl || null,
        maxGuests: input.maxGuests ?? null,
      }),
      201
    );
  });
}
