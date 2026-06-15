import { existsSync } from "fs";
import path from "path";

/** Where catalog images are stored — matches Next.js `public` in dev and Docker standalone. */
export function getCatalogUploadDir(): string {
  const fromEnv = process.env.CATALOG_UPLOAD_DIR?.trim();
  if (fromEnv) return fromEnv;

  const cwd = process.cwd();
  const standalonePublic = path.join(cwd, "apps", "web", "public");
  if (existsSync(standalonePublic)) {
    return path.join(standalonePublic, "uploads", "catalog");
  }

  return path.join(cwd, "public", "uploads", "catalog");
}

export const CATALOG_UPLOAD_URL_PREFIX = "/uploads/catalog/";
