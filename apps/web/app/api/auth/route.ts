import { updateProfileSchema } from "@monana/types";
import { updateUserProfile } from "@monana/users";
import { prisma } from "../../../lib/db";
import { handle, ok, parseBody } from "../../../lib/api";
import { ApiError, getAuth } from "../../../lib/auth";

const userSelect = {
  id: true,
  name: true,
  phone: true,
  email: true,
  role: true,
  locale: true,
  createdAt: true,
  updatedAt: true,
} as const;

// GET /api/auth -> current authenticated user ("me").
export async function GET(req: Request) {
  return handle(async () => {
    const auth = getAuth(req);
    if (!auth) throw new ApiError("Hujaingia (no token)", 401);
    const user = await prisma.user.findUnique({
      where: { id: auth.sub },
      select: userSelect,
    });
    if (!user) throw new ApiError("Mtumiaji hajapatikana", 404);
    return ok(user);
  });
}

// PATCH /api/auth — update own profile
export async function PATCH(req: Request) {
  return handle(async () => {
    const auth = getAuth(req);
    if (!auth) throw new ApiError("Hujaingia (no token)", 401);
    const input = await parseBody(req, updateProfileSchema);
    const user = await updateUserProfile(auth.sub, {
      name: input.name,
      email: input.email === "" ? null : input.email,
    });
    return ok(user);
  });
}
