import { updateProfileSchema } from "@monana/types";
import { updateUserProfile, UserServiceError } from "@monana/users";
import { prisma } from "../../../lib/db";
import { handle, ok, parseBody } from "../../../lib/api";
import { ApiError, getAuth, signToken } from "../../../lib/auth";

const userSelect = {
  id: true,
  name: true,
  phone: true,
  email: true,
  role: true,
  locale: true,
  imageUrl: true,
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
    if (!user) throw new ApiError("Kipindi kimeisha — tafadhali ingia tena", 401);
    return ok(user);
  });
}

// PATCH /api/auth — update own profile (name, email, phone, locale, photo)
export async function PATCH(req: Request) {
  return handle(async () => {
    const auth = getAuth(req);
    if (!auth) throw new ApiError("Hujaingia (no token)", 401);
    const input = await parseBody(req, updateProfileSchema);

    try {
      const user = await updateUserProfile(auth.sub, {
        name: input.name,
        email: input.email === "" ? null : input.email,
        phone: input.phone,
        locale: input.locale,
        imageUrl:
          input.imageUrl === undefined
            ? undefined
            : input.imageUrl === "" || input.imageUrl === null
              ? null
              : input.imageUrl,
      });

      // Re-issue JWT if phone changed so token stays in sync
      const token =
        input.phone && input.phone !== auth.phone
          ? signToken({ sub: user.id, role: user.role, phone: user.phone })
          : undefined;

      return ok(token ? { ...user, token } : user);
    } catch (err) {
      if (err instanceof UserServiceError) throw new ApiError(err.message, err.status);
      throw err;
    }
  });
}
