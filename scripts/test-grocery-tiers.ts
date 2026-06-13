/**
 * Grocery two-tier tests: ON_DEMAND vs SUBSCRIPTION.
 * Run: npx tsx scripts/test-grocery-tiers.ts
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

async function api<T>(method: string, path: string, token?: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json()) as Res<T>;
  if (!json.success) throw new Error(`${method} ${path}: ${json.error}`);
  return json.data as T;
}

async function main() {
  console.log("🛒 Grocery tiers test…");
  const token = await loginAdmin();
  let passed = 0;
  let failed = 0;

  const phone = `2557${String(Date.now()).slice(-8)}`;
  const reg = await api<{ user: { id: string }; token: string }>("POST", "/api/auth/register", undefined, {
    phone,
    name: "Grocery Tier Test",
  });
  const userId = reg.user.id;
  const userToken = reg.token;

  const packages = await api<{ id: string }[]>("GET", "/api/grocery/packages");
  if (!packages[0]) throw new Error("No packages in seed");
  const products = await api<{ id: string }[]>("GET", "/api/grocery/products");
  if (!products[0]) throw new Error("No products");

  const tests: { name: string; fn: () => Promise<void> }[] = [
    {
      name: "ON_DEMAND order has orderType=ON_DEMAND",
      fn: async () => {
        const order = await api<{ orderType: string }>(
          "POST",
          "/api/orders",
          userToken,
          {
            userId,
            module: "GROCERY",
            items: [{ productId: products[0].id, quantity: 1 }],
            address: "Test Address DSM",
          }
        );
        if (order.orderType !== "ON_DEMAND") throw new Error(`got ${order.orderType}`);
      },
    },
    {
      name: "SUBSCRIPTION enroll + first order",
      fn: async () => {
        const result = await api<{
          subscription: { id: string; status: string; nextRunAt: string };
          firstOrder: { id: string; orderType: string } | null;
          firstPayment: { id: string } | null;
        }>("POST", "/api/grocery/subscriptions", userToken, {
          userId,
          packageId: packages[0].id,
          address: "Usajili Address 123",
          startNow: true,
          preferredDayOfWeek: 6,
        });
        if (!result.firstOrder) throw new Error("missing firstOrder");
        if (result.subscription.status !== "PENDING_PAYMENT") throw new Error("expected PENDING_PAYMENT");
        if (!result.firstPayment) throw new Error("missing prepay payment");
      },
    },
    {
      name: "Upfront payment activates subscription",
      fn: async () => {
        const subs = await api<{ id: string; status: string }[]>(
          "GET",
          `/api/grocery/subscriptions?userId=${userId}`,
          userToken
        );
        const sub = subs.find((s) => s.status === "PENDING_PAYMENT");
        if (!sub) return;
        const detail = await api<{ orders: { payment: { id: string } | null }[] }>(
          "GET",
          `/api/grocery/subscriptions/${sub.id}`,
          userToken
        );
        const paymentId = detail.orders[0]?.payment?.id;
        if (!paymentId) throw new Error("no payment");
        await api("POST", "/api/payments/confirm", token, { paymentId, action: "confirm" });
        const updated = await api<{ status: string }>("GET", `/api/grocery/subscriptions/${sub.id}`, userToken);
        if (updated.status !== "ACTIVE") throw new Error("not active after pay");
      },
    },
    {
      name: "Pause subscription for 1 week",
      fn: async () => {
        const subs = await api<{ id: string; status: string }[]>(
          "GET",
          `/api/grocery/subscriptions?userId=${userId}`,
          userToken
        );
        const sub = subs.find((s) => s.status === "ACTIVE");
        if (!sub) return;
        const paused = await api<{ status: string }>(
          "POST",
          `/api/grocery/subscriptions/${sub.id}/pause`,
          userToken,
          { weeks: 1 }
        );
        if (paused.status !== "PAUSED") throw new Error("not paused");
      },
    },
    {
      name: "Edit basket before cutoff",
      fn: async () => {
        const subs = await api<{ id: string }[]>("GET", `/api/grocery/subscriptions?userId=${userId}`, userToken);
        const sub = subs[0];
        if (!sub) return;
        await api("PATCH", `/api/grocery/subscriptions/${sub.id}/basket`, userToken, {
          items: [{ productId: products[0].id, quantity: 2 }],
        });
        const upcoming = await api<{ items: { quantity: number }[] }>(
          "GET",
          `/api/grocery/subscriptions/${sub.id}/upcoming`,
          userToken
        );
        if (!upcoming.items?.[0] || upcoming.items[0].quantity !== 2) throw new Error("basket not updated");
      },
    },
    {
      name: "GET orders?orderType=ON_DEMAND filter",
      fn: async () => {
        const r = await api<{ items: { orderType: string }[] }>(
          "GET",
          `/api/orders?userId=${userId}&module=GROCERY&orderType=ON_DEMAND`,
          userToken
        );
        const items = Array.isArray(r) ? r : r.items;
        if (items.some((o) => o.orderType !== "ON_DEMAND")) throw new Error("filter leak");
      },
    },
    {
      name: "GET orders?orderType=SUBSCRIPTION filter",
      fn: async () => {
        const r = await api<{ items: { orderType: string }[] }>(
          "GET",
          `/api/orders?userId=${userId}&module=GROCERY&orderType=SUBSCRIPTION`,
          userToken
        );
        const items = Array.isArray(r) ? r : r.items;
        if (!items.length) throw new Error("expected subscription orders");
      },
    },
    {
      name: "Admin grocery stats include tier counts",
      fn: async () => {
        const stats = await api<{
          ordersOnDemandToday: number;
          ordersSubscriptionToday: number;
          subscriptionsActive: number;
        }>("GET", "/api/admin/grocery/stats", token);
        if (typeof stats.ordersOnDemandToday !== "number") throw new Error("missing onDemand");
        if (typeof stats.ordersSubscriptionToday !== "number") throw new Error("missing subscription");
      },
    },
    {
      name: "POST run-due (admin)",
      fn: async () => {
        const r = await api<{ processed: number; results: unknown[] }>(
          "POST",
          "/api/grocery/subscriptions/run-due",
          token
        );
        if (typeof r.processed !== "number") throw new Error("bad response");
      },
    },
    {
      name: "Customer can list subscriptions",
      fn: async () => {
        const subs = await api<{ id: string }[]>("GET", `/api/grocery/subscriptions?userId=${userId}`, userToken);
        if (!subs.length) throw new Error("no subs");
      },
    },
    {
      name: "Customer can PAUSE subscription",
      fn: async () => {
        const subs = await api<{ id: string; status: string }[]>(
          "GET",
          `/api/grocery/subscriptions?userId=${userId}`,
          userToken
        );
        const sub = subs.find((s) => s.status === "ACTIVE") ?? subs[0];
        const updated = await api<{ status: string }>(
          "PATCH",
          `/api/grocery/subscriptions/${sub.id}`,
          userToken,
          { status: "PAUSED" }
        );
        if (updated.status !== "PAUSED") throw new Error("not paused");
      },
    },
    {
      name: "Admin: package CRUD",
      fn: async () => {
        const products = await api<{ id: string }[]>("GET", "/api/grocery/products");
        const created = await api<{ id: string; kind: string }>("POST", "/api/grocery/packages", token, {
          name: `Test Weekly ${Date.now()}`,
          kind: "WEEKLY_BASKET",
          price: 5000,
          items: [{ productId: products[0].id, quantity: 1 }],
        });
        if (created.kind !== "WEEKLY_BASKET") throw new Error("wrong kind");
        await api("PATCH", `/api/grocery/packages/${created.id}`, token, { price: 5500 });
        await api("DELETE", `/api/grocery/packages/${created.id}`, token);
      },
    },
    {
      name: "Store entry shows two paths",
      fn: async () => {
        const entry = await api<{ paths: { id: string }[] }>("GET", "/api/grocery/store");
        const ids = entry.paths.map((p) => p.id);
        if (!ids.includes("MEMBERSHIP") || !ids.includes("ON_DEMAND")) throw new Error("missing paths");
      },
    },
    {
      name: "Membership setup returns plans + delivery days",
      fn: async () => {
        const setup = await api<{ plans: { id: string }[]; deliveryDays: { weekly: unknown[] } }>(
          "GET",
          "/api/grocery/store/membership"
        );
        if (!setup.plans.some((p) => p.id === "WEEKLY")) throw new Error("no weekly plan");
        if (!setup.deliveryDays.weekly.length) throw new Error("no delivery days");
      },
    },
    {
      name: "Membership preview + enroll with default basket",
      fn: async () => {
        const phone2 = `2557${String(Date.now() + 1).slice(-8)}`;
        const reg2 = await api<{ user: { id: string }; token: string }>("POST", "/api/auth/register", undefined, {
          phone: phone2,
          name: "Membership Store Test",
        });
        const preview = await api<{ pricing: { total: number; discountPercent: number } }>(
          "POST",
          "/api/grocery/store/membership/preview",
          reg2.token,
          {
            plan: "WEEKLY",
            defaultBasket: [{ productId: products[0].id, quantity: 2 }],
          }
        );
        if (preview.pricing.discountPercent !== 3) throw new Error("wrong weekly discount");
        const enrolled = await api<{
          subscription: { status: string; defaultBasket: unknown };
          firstOrder: { orderType: string; total: number };
          deliverySchedule: string;
        }>("POST", "/api/grocery/store/membership", reg2.token, {
          userId: reg2.user.id,
          plan: "WEEKLY",
          address: "Membership Address 456",
          preferredDayOfWeek: 6,
          defaultBasket: [{ productId: products[0].id, quantity: 2 }],
          startNow: true,
        });
        if (enrolled.subscription.status !== "PENDING_PAYMENT") throw new Error("not pending");
        if (enrolled.firstOrder.orderType !== "SUBSCRIPTION") throw new Error("wrong order type");
        if (!enrolled.deliverySchedule?.includes("Saturday") && !enrolled.deliverySchedule?.includes("Jumamosi")) throw new Error("bad schedule label");
      },
    },
    {
      name: "On-demand catalog via store API",
      fn: async () => {
        const catalog = await api<{ orderType: string; products: unknown[] }>(
          "GET",
          "/api/grocery/store/on-demand"
        );
        if (catalog.orderType !== "ON_DEMAND") throw new Error("wrong type");
        if (!catalog.products.length) throw new Error("no products");
      },
    },
    {
      name: "Bot menu API (English default)",
      fn: async () => {
        const menu = await api<{ locale: string; welcome: string; groups: { title: string }[] }>(
          "GET",
          "/api/bot/menu"
        );
        if (menu.locale !== "en") throw new Error("expected en default");
        if (!menu.welcome.includes("Welcome")) throw new Error("not english welcome");
        if (menu.groups.length < 3) throw new Error("missing menu groups");
      },
    },
    {
      name: "Bot menu API (Swahili)",
      fn: async () => {
        const menu = await api<{ locale: string; welcome: string }>("GET", "/api/bot/menu?locale=sw");
        if (menu.locale !== "sw") throw new Error("expected sw");
        if (!menu.welcome.includes("Karibu")) throw new Error("not swahili welcome");
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
