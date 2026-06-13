// Shared helpers for API routes: consistent JSON responses + error handling.
import { NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";
import { serialize } from "@monana/utils";
import { ApiError } from "./auth";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data: serialize(data) }, { status });
}

export function fail(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

/** Parse + validate a request body against a zod schema. */
export async function parseBody<T>(req: Request, schema: ZodSchema<T>): Promise<T> {
  const json = await req.json().catch(() => {
    throw new ApiError("Body si JSON sahihi", 400);
  });
  return schema.parse(json);
}

/** Wrap a route handler to convert thrown errors into clean JSON responses. */
export function handle(fn: () => Promise<Response>): Promise<Response> {
  return fn().catch((err: unknown) => {
    if (err instanceof ZodError) {
      const msg = err.issues.map((i) => i.message).join(", ");
      return fail(msg, 422);
    }
    if (err instanceof ApiError) {
      return fail(err.message, err.status);
    }
    const message = err instanceof Error ? err.message : "Hitilafu isiyojulikana";
    return fail(message, 400);
  });
}
