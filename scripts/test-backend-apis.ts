/**
 * Backend API smoke tests (admin + customer flows).
 * Run: npx tsx scripts/test-backend-apis.ts
 * Requires: web :3000, DB seeded (admin 255700000000 / admin123)
 */
const BASE = process.env.WEB_URL ?? "http://localhost:3000";
const BOT_HEADER = { "x-monana-channel": "WHATSAPP" };

type Res<T> = { success: boolean; data?: T; error?: string };

async function loginAdmin() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: "255700000000", password: "admin123" }),
  });
  const json = (await res.json()) as Res<{ token: string; user: { id: string } }>;
  if (!json.success || !json.data?.token) throw new Error(`Admin login: ${json.error}`);
  return json.data.token;
}

async function api<T>(
  method: string,
  path: string,
  token?: string,
  body?: unknown,
  extraHeaders?: Record<string, string>
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extraHeaders,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json()) as Res<T>;
  if (!json.success) throw new Error(`${method} ${path}: ${json.error}`);
  return json.data as T;
}

async function main() {
  console.log("🔐 Admin login…");
  const token = await loginAdmin();
  let passed = 0;
  let failed = 0;

  const tests: { name: string; fn: () => Promise<void> }[] = [
    {
      name: "GET /api/auth (me)",
      fn: async () => {
        const me = await api<{ phone: string; role: string }>("GET", "/api/auth", token);
        if (me.role !== "ADMIN") throw new Error("not admin");
      },
    },
    {
      name: "GET /api/admin/settings",
      fn: async () => {
        await api("GET", "/api/admin/settings", token);
      },
    },
    {
      name: "GET /api/admin/users (paginated)",
      fn: async () => {
        const r = await api<{ items: unknown[]; meta: { total: number } }>(
          "GET",
          "/api/admin/users?page=1&limit=5",
          token
        );
        if (!Array.isArray(r.items)) throw new Error("expected paginated users");
      },
    },
    {
      name: "GET /api/orders (paginated)",
      fn: async () => {
        const r = await api<{ items: unknown[]; meta: unknown }>(
          "GET",
          "/api/orders?page=1&limit=5",
          token
        );
        if (!r.meta) throw new Error("missing meta");
      },
    },
    {
      name: "GET /api/orders/:id with allowedNextStatuses",
      fn: async () => {
        const list = await api<{ items: { id: string; module: string }[] }>(
          "GET",
          "/api/orders?limit=1",
          token
        );
        if (!list.items[0]) return;
        const detail = await api<{ allowedNextStatuses: string[]; module: string }>(
          "GET",
          `/api/orders/${list.items[0].id}`,
          token
        );
        if (!Array.isArray(detail.allowedNextStatuses)) throw new Error("no next statuses");
      },
    },
    {
      name: "GET /api/payments (paginated)",
      fn: async () => {
        await api("GET", "/api/payments?page=1&limit=5", token);
      },
    },
    {
      name: "GET /api/grocery/products (public)",
      fn: async () => {
        const products = await api<{ unit?: string }[]>("GET", "/api/grocery/products");
        if (!Array.isArray(products)) throw new Error("not array");
      },
    },
    {
      name: "GET /api/grocery/products/:id",
      fn: async () => {
        const products = await api<{ id: string }[]>("GET", "/api/grocery/products");
        if (!products[0]) return;
        const p = await api<{ name: string; unit: string }>("GET", `/api/grocery/products/${products[0].id}`);
        if (!p.unit) throw new Error("missing unit");
      },
    },
    {
      name: "GET /api/restaurant/menu",
      fn: async () => {
        await api("GET", "/api/restaurant/menu?slot=LUNCH");
      },
    },
    {
      name: "POST /api/grocery/categories + PATCH + DELETE",
      fn: async () => {
        const cat = await api<{ id: string }>("POST", "/api/grocery/categories", token, {
          name: `Test Cat ${Date.now()}`,
          module: "GROCERY",
        });
        await api("PATCH", `/api/grocery/categories/${cat.id}`, token, { name: "Test Cat Updated" });
        await api("DELETE", `/api/grocery/categories/${cat.id}`, token);
      },
    },
    {
      name: "Customer: register + orders list (auth)",
      fn: async () => {
        const phone = `2557${String(Date.now()).slice(-8)}`;
        const reg = await api<{ token: string; user: { id: string } }>("POST", "/api/auth/register", undefined, {
          phone,
          name: "API Test User",
        });
        await api("GET", `/api/orders?userId=${reg.user.id}`, reg.token);
      },
    },
    {
      name: "Bot channel: GET orders without JWT",
      fn: async () => {
        const users = await api<{ items: { id: string }[] }>("GET", "/api/admin/users?limit=1", token);
        const uid = users.items[0]?.id;
        if (!uid) return;
        await api("GET", `/api/orders?userId=${uid}`, undefined, undefined, BOT_HEADER);
      },
    },
    {
      name: "GET /api/grocery/subscriptions?all=1 paginated",
      fn: async () => {
        await api("GET", "/api/grocery/subscriptions?all=1&page=1&limit=5", token);
      },
    },
    {
      name: "POST /api/restaurant/menu (create)",
      fn: async () => {
        await api("POST", "/api/restaurant/menu", token, {
          name: `Test Menu ${Date.now()}`,
          description: "API test",
        });
      },
    },
  ];

  for (const t of tests) {
    try {
      await t.fn();
      console.log("✅", t.name);
      passed++;
    } catch (e) {
      console.log("❌", t.name, "—", e instanceof Error ? e.message : e);
      failed++;
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
