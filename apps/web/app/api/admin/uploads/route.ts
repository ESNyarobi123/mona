import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { handle, ok } from "../../../../lib/api";
import { ApiError, requireAdmin } from "../../../../lib/auth";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/** POST /api/admin/uploads — multipart image upload → public URL */
export function POST(req: Request) {
  return handle(async () => {
    requireAdmin(req);

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new ApiError("No file provided", 400);
    }

    if (!ALLOWED.has(file.type)) {
      throw new ApiError("Only JPEG, PNG, WebP, or GIF images are allowed", 400);
    }

    if (file.size > MAX_BYTES) {
      throw new ApiError("Image must be 5 MB or smaller", 400);
    }

    const ext =
      file.type === "image/jpeg"
        ? "jpg"
        : file.type === "image/png"
          ? "png"
          : file.type === "image/webp"
            ? "webp"
            : "gif";

    const filename = `${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
    const dir = path.join(process.cwd(), "public", "uploads", "catalog");
    await mkdir(dir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, filename), buffer);

    return ok({ url: `/uploads/catalog/${filename}` }, 201);
  });
}
