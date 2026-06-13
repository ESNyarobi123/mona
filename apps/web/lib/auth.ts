// Authentication helpers. MVP: phone-based login with optional password + JWT.
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { prisma, type Role } from "@monana/db";
import { normalizeTanzaniaPhone } from "@monana/utils";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-me";
const TOKEN_TTL = "30d";

export type JwtPayload = { sub: string; role: Role; phone: string };

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

function normalizePhone(phone: string) {
  return normalizeTanzaniaPhone(phone);
}

export async function registerUser(input: {
  phone: string;
  name?: string;
  password?: string;
  email?: string;
  locale?: "en" | "sw";
}) {
  const phone = normalizePhone(input.phone);
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) throw new ApiError("Namba ya simu tayari imesajiliwa. Ingia badala yake.", 409);

  return prisma.user.create({
    data: {
      phone,
      name: input.name,
      email: input.email,
      password: input.password ? await hashPassword(input.password) : undefined,
      locale: input.locale ?? "en",
    },
  });
}

export async function isPhoneAvailable(phone: string): Promise<boolean> {
  const normalized = normalizePhone(phone);
  const existing = await prisma.user.findUnique({ where: { phone: normalized } });
  return !existing;
}

export async function loginUser(input: { phone: string; password?: string }) {
  const user = await prisma.user.findUnique({ where: { phone: normalizePhone(input.phone) } });
  if (!user) throw new Error("Mtumiaji hajapatikana");

  // If the account has a password set, it must match.
  if (user.password) {
    if (!input.password) throw new Error("Password inahitajika");
    const ok = await bcrypt.compare(input.password, user.password);
    if (!ok) throw new Error("Password si sahihi");
  }

  return user;
}

/**
 * Option A — WhatsApp login: phone = identity, hakuna password.
 * Namba ipo kwenye DB → ingia moja kwa moja (kama Telegram / M-Pesa bots).
 */
export async function loginByWhatsApp(phone: string) {
  const normalized = normalizePhone(phone);
  const user = await prisma.user.findUnique({ where: { phone: normalized } });
  if (!user) throw new ApiError("Mtumiaji hajapatikana", 404);
  return user;
}

/** @deprecated prefer loginByWhatsApp for bot; kept for legacy identify endpoint */
export async function findOrCreateUser(phone: string, name?: string) {
  const normalized = normalizePhone(phone);
  return prisma.user.upsert({
    where: { phone: normalized },
    update: name ? { name } : {},
    create: { phone: normalized, name },
  });
}

/** Extract the bearer token from a request and return its payload. */
export function getAuth(req: Request): JwtPayload | null {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  return token ? verifyToken(token) : null;
}

export function requireAdmin(req: Request): JwtPayload {
  const auth = getAuth(req);
  if (!auth || auth.role !== "ADMIN") {
    throw new ApiError("Huna ruhusa (admin pekee)", 403);
  }
  return auth;
}

export function requireAuth(req: Request): JwtPayload {
  const auth = getAuth(req);
  if (!auth) throw new ApiError("Ingia kwanza", 401);
  return auth;
}

/** Trusted WhatsApp bot bridge (same server / internal). */
export function isBotChannel(req: Request): boolean {
  return req.headers.get("x-monana-channel") === "WHATSAPP";
}

/** Customer JWT must match userId, or admin, or trusted bot channel. */
export function requireSelfAdminOrBot(req: Request, userId: string): JwtPayload | null {
  const auth = getAuth(req);
  if (auth) {
    if (auth.role === "ADMIN" || auth.sub === userId) return auth;
    throw new ApiError("Huna ruhusa", 403);
  }
  if (isBotChannel(req)) return null;
  throw new ApiError("Ingia kwanza", 401);
}

/** Scheduled jobs: `x-cron-secret` header or admin JWT. */
export function requireCronOrAdmin(req: Request): JwtPayload | null {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("x-cron-secret");
  if (secret && header === secret) return null;
  return requireAdmin(req);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
