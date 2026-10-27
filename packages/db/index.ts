export { prisma } from "./client";
export * from "@prisma/client";

/**
 * Safe user projection — never exposes `password` (bcrypt hash).
 * Use this for every `user` include/select that reaches an API response.
 */
export const publicUserSelect = {
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

export type PublicUser = {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  role: string;
  locale: string;
  imageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Strip the password hash from a full user record. */
export function toPublicUser<T extends { password?: unknown }>(user: T) {
  const { password: _password, ...rest } = user;
  return rest;
}
