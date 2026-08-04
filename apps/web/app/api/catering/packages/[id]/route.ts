import {
  deactivateCateringPackage,
  getCateringPackageById,
  updateCateringPackage,
} from "@monana/catering";
import { upsertCateringPackageSchema } from "@monana/types";
import { handle, ok, parseBody } from "../../../../../lib/api";
import { ApiError, getAuth, requireAdmin } from "../../../../../lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export function GET(req: Request, ctx: Ctx) {
  return handle(async () => {
    const { id } = await ctx.params;
    const pkg = await getCateringPackageById(id);
    if (!pkg) throw new ApiError("Kifurushi hakipatikani", 404);
    const auth = getAuth(req);
    if (!pkg.active && auth?.role !== "ADMIN") {
      throw new ApiError("Kifurushi hakipatikani", 404);
    }
    return ok(pkg);
  });
}

export function PATCH(req: Request, ctx: Ctx) {
  return handle(async () => {
    requireAdmin(req);
    const { id } = await ctx.params;
    const existing = await getCateringPackageById(id);
    if (!existing) throw new ApiError("Kifurushi hakipatikani", 404);
    const input = await parseBody(req, upsertCateringPackageSchema.partial());
    // Only forward keys that were actually sent — avoids wiping arrays/fields.
    const patch: Parameters<typeof updateCateringPackage>[1] = {};
    if (input.code !== undefined) patch.code = input.code;
    if (input.nameEn !== undefined) patch.nameEn = input.nameEn;
    if (input.nameSw !== undefined) patch.nameSw = input.nameSw;
    if (input.descriptionEn !== undefined) patch.descriptionEn = input.descriptionEn;
    if (input.descriptionSw !== undefined) patch.descriptionSw = input.descriptionSw;
    if (input.pricePerHead !== undefined) patch.pricePerHead = input.pricePerHead;
    if (input.minGuests !== undefined) patch.minGuests = input.minGuests;
    if (input.maxGuests !== undefined) patch.maxGuests = input.maxGuests;
    if (input.featuresEn !== undefined) patch.featuresEn = input.featuresEn;
    if (input.featuresSw !== undefined) patch.featuresSw = input.featuresSw;
    if (input.imageUrl !== undefined) patch.imageUrl = input.imageUrl === "" ? null : input.imageUrl;
    if (input.active !== undefined) patch.active = input.active;
    if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;
    return ok(await updateCateringPackage(id, patch));
  });
}

export function DELETE(req: Request, ctx: Ctx) {
  return handle(async () => {
    requireAdmin(req);
    const { id } = await ctx.params;
    return ok(await deactivateCateringPackage(id));
  });
}
