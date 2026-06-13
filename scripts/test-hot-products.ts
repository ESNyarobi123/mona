/**
 * Hot products admin + public API tests.
 * Run: npx tsx scripts/test-hot-products.ts
 */
const BASE = process.env.WEB_URL ?? "http://localhost:3000";

type Res<T> = { success: boolean; data?: T; error?: string };

async function loginAdmin() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: "255700000000", password: "admin123" }),
  });
  const json = (await res.json()) as Res<{ token: string }>;
  if (!json.success || !json.data?.token) throw new Error(`Admin login: ${json.error}`);
  return json.data.token;
}

async function api<T>(method: string, path: string, token?: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json()) as Res<T>;
  if (!json.success) throw new Error(`${method} ${path}: ${json.error}`);
  return json.data as T;
}

async function main() {
  console.log("🔥 Hot products test…");
  const token = await loginAdmin();
  let passed = 0;
  let failed = 0;

  const products = await api<{ id: string }[]>("GET", "/api/grocery/products");
  if (!products[0]) throw new Error("No products in seed");

  const tests: { name: string; fn: () => Promise<void> }[] = [
    {
      name: "Public API returns disabled by default",
      fn: async () => {
        const r = await api<{ enabled: boolean; items: unknown[] }>("GET", "/api/hot-products?module=GROCERY");
        if (r.enabled !== false) throw new Error("expected disabled");
        if (r.items.length) throw new Error("expected empty");
      },
    },
    {
      name: "Admin GET all modules",
      fn: async () => {
        const r = await api<{ configs: { module: string }[]; modules: unknown[] }>(
          "GET",
          "/api/admin/hot-products",
          token
        );
        if (r.configs.length < 2) throw new Error("missing configs");
      },
    },
    {
      name: "Enable MANUAL mode + add pick",
      fn: async () => {
        await api("PATCH", "/api/admin/hot-products", token, {
          module: "GROCERY",
          enabled: true,
          mode: "MANUAL",
          maxItems: 5,
        });
        const pick = await api<{ id: string; productId: string }>(
          "POST",
          "/api/admin/hot-products/manual",
          token,
          { module: "GROCERY", productId: products[0].id, badge: "🔥 Bestseller" }
        );
        if (!pick.id) throw new Error("no pick id");
      },
    },
    {
      name: "Public API returns manual pick",
      fn: async () => {
        const r = await api<{ enabled: boolean; mode: string; items: { name: string; badge?: string }[] }>(
          "GET",
          "/api/hot-products?module=GROCERY"
        );
        if (!r.enabled) throw new Error("not enabled");
        if (r.mode !== "MANUAL") throw new Error("not manual");
        if (!r.items.length) throw new Error("no items");
        if (!r.items[0].badge?.includes("🔥")) throw new Error("missing badge");
      },
    },
    {
      name: "Switch to AUTO mode",
      fn: async () => {
        const view = await api<{ config: { mode: string }; autoPreview: unknown[] }>(
          "PATCH",
          "/api/admin/hot-products",
          token,
          { module: "GROCERY", mode: "AUTO", lookbackDays: 90 }
        );
        if (view.config.mode !== "AUTO") throw new Error("not auto");
      },
    },
    {
      name: "Disable hot products",
      fn: async () => {
        await api("PATCH", "/api/admin/hot-products", token, { module: "GROCERY", enabled: false });
        const r = await api<{ enabled: boolean }>("GET", "/api/hot-products?module=GROCERY");
        if (r.enabled) throw new Error("still enabled");
      },
    },
    {
      name: "Cleanup manual pick",
      fn: async () => {
        const view = await api<{ manualPicks: { id: string }[] }>(
          "GET",
          "/api/admin/hot-products?module=GROCERY",
          token
        );
        for (const p of view.manualPicks) {
          await api("DELETE", `/api/admin/hot-products/manual/${p.id}`, token);
        }
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
