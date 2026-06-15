import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getCatalogUploadDir } from "../../../../lib/catalog-upload";

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

/** Serve uploaded catalog images — required for Docker standalone (runtime public files). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  if (!filename || filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return new NextResponse("Not found", { status: 404 });
  }

  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const mime = MIME[ext];
  if (!mime) return new NextResponse("Not found", { status: 404 });

  try {
    const buffer = await readFile(path.join(getCatalogUploadDir(), filename));
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
