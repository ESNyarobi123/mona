import { NextResponse } from "next/server";

/** @deprecated Use GET /api/grocery/products */
export async function GET() {
  return NextResponse.redirect(new URL("/api/grocery/products", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"), 308);
}
