"use client";

const TOKEN_KEY = "monana_token";
const USER_KEY = "monana_user";

export type StoredUser = { id: string; name: string | null; phone: string; role: string };

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export function setSession(token: string, user: StoredUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

type ApiResult<T> = { success: true; data: T } | { success: false; error: string };

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  const json = (await res.json()) as ApiResult<T>;
  if (!json.success) {
    throw new Error("error" in json ? json.error : "Hitilafu ya API");
  }
  return json.data;
}

export async function apiGet<T>(path: string) {
  return apiFetch<T>(path);
}

export async function apiPost<T>(path: string, body: unknown) {
  return apiFetch<T>(path, { method: "POST", body: JSON.stringify(body) });
}

export async function apiPatch<T>(path: string, body: unknown) {
  return apiFetch<T>(path, { method: "PATCH", body: JSON.stringify(body) });
}

export async function apiDelete<T>(path: string) {
  return apiFetch<T>(path, { method: "DELETE" });
}

/** Multipart upload — do not set Content-Type (browser sets boundary). */
export async function apiUploadFile(path: string, file: File): Promise<{ url: string }> {
  const token = getToken();
  const body = new FormData();
  body.append("file", file);

  const res = await fetch(path, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body,
  });

  const json = (await res.json()) as { success: true; data: { url: string } } | { success: false; error: string };
  if (!json.success) {
    throw new Error("error" in json ? json.error : "Upload failed");
  }
  return json.data;
}

/** API list endpoints return either an array or { items, meta }. */
export function normalizeApiList<T>(data: T[] | { items: T[] }): T[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && "items" in data && Array.isArray(data.items)) {
    return data.items;
  }
  return [];
}
