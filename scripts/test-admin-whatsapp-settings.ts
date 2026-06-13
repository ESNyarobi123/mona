/**
 * Test admin WhatsApp/settings APIs.
 * Run: npx tsx scripts/test-admin-whatsapp-settings.ts
 * Requires: web :3000, bot :4000 (optional for QR/status)
 */
const BASE = process.env.WEB_URL ?? "http://localhost:3000";
const BOT = process.env.BOT_URL ?? "http://localhost:4000";

async function login(): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: "255700000000" }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data.token;
}

async function authGet(token: string, path: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!json.success) throw new Error(`${path}: ${json.error}`);
  return json.data;
}

async function authPatch(token: string, path: string, body: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.success) throw new Error(`${path}: ${json.error}`);
  return json.data;
}

async function main() {
  console.log("🔐 Login admin…");
  const token = await login();
  let ok = 0;

  try {
    const settings = await authGet(token, "/api/admin/settings");
    console.log("✅ GET /api/admin/settings");
    console.log("   bot online:", settings.bot.online, "state:", settings.bot.status?.state);
    ok++;
  } catch (e) {
    console.log("❌ GET settings:", e instanceof Error ? e.message : e);
  }

  try {
    const updated = await authPatch(token, "/api/admin/settings", {
      lipaNambaName: "MONANA TEST",
    });
    console.log("✅ PATCH settings — lipa name:", updated.lipaNambaName);
    ok++;
  } catch (e) {
    console.log("❌ PATCH settings:", e instanceof Error ? e.message : e);
  }

  try {
    const templates = await authGet(token, "/api/admin/notifications/test");
    console.log("✅ GET notification templates:", templates.length);
    ok++;
  } catch (e) {
    console.log("❌ GET templates:", e instanceof Error ? e.message : e);
  }

  try {
    const health = await fetch(`${BOT}/health`);
    console.log(health.ok ? "✅ Bot /health" : "⚠️ Bot offline");
    if (health.ok) {
      const st = await (await fetch(`${BOT}/status`)).json();
      console.log("   status:", st.data?.state, "connected:", st.data?.connected);
      ok++;
    }
  } catch {
    console.log("⚠️ Bot haijafunguka (npm run dev:bot)");
  }

  console.log(`\n${ok} checks passed`);
  process.exit(ok >= 3 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
