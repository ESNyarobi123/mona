/**
 * Test admin dashboard APIs. Run: npx tsx scripts/test-admin-dashboard-apis.ts
 * Requires: web on http://localhost:3000, DB seeded with admin 255700000000
 */
const BASE = process.env.WEB_URL ?? "http://localhost:3000";

async function login(): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: "255700000000" }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(`Login: ${json.error}`);
  if (json.data.user.role !== "ADMIN") throw new Error("User si ADMIN");
  return json.data.token as string;
}

async function get(token: string, path: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!json.success) throw new Error(`${path}: ${json.error}`);
  return json.data;
}

async function main() {
  console.log("🔐 Login admin…");
  const token = await login();
  const tests: { name: string; path: string }[] = [
    { name: "Overview stats", path: "/api/admin/stats" },
    { name: "Restaurant stats", path: "/api/admin/restaurant/stats" },
    { name: "Grocery stats", path: "/api/admin/grocery/stats" },
    { name: "Orders (admin)", path: "/api/orders" },
    { name: "Payments (admin)", path: "/api/payments" },
    { name: "Menu (all)", path: "/api/restaurant/menu?all=1" },
    { name: "Kitchen queue", path: "/api/restaurant/kitchen" },
    { name: "Grocery products (all)", path: "/api/grocery/products?all=1" },
    { name: "Grocery categories", path: "/api/grocery/categories" },
    { name: "Grocery packages (all)", path: "/api/grocery/packages?all=1" },
    { name: "Grocery subscriptions (all)", path: "/api/grocery/subscriptions?all=1" },
  ];

  let ok = 0;
  for (const t of tests) {
    try {
      const data = await get(token, t.path);
      const preview = Array.isArray(data) ? `array(${data.length})` : typeof data === "object" ? Object.keys(data).join(", ") : String(data);
      console.log(`✅ ${t.name} → ${preview}`);
      ok++;
    } catch (e) {
      console.log(`❌ ${t.name} → ${e instanceof Error ? e.message : e}`);
    }
  }
  console.log(`\n${ok}/${tests.length} passed`);
  process.exit(ok === tests.length ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
