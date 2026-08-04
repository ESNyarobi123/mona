/**
 * Smoke test: Social Order RFQ → Send Price → pay-before-cook
 * Usage: npx tsx scripts/test-custom-orders.ts [baseUrl]
 */
const BASE = process.argv[2] ?? process.env.API_BASE_URL?.replace(/\/api$/, "") ?? "http://localhost:3000";

async function api(
  method: string,
  path: string,
  token?: string,
  body?: unknown,
  headers: Record<string, string> = {}
) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    data?: any;
    error?: string;
  };
  return { status: res.status, json };
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function main() {
  console.log(`Testing Social Order RFQ against ${BASE}`);

  const lead = await api("GET", "/api/restaurant/social-orders?meta=lead-time");
  assert(lead.status === 200 && lead.json.success, `lead-time failed: ${lead.json.error}`);
  assert(lead.json.data.cashOnDeliveryAllowed === false, "COD must be blocked");
  assert(lead.json.data.payBeforeCook === true, "payBeforeCook required");
  console.log("✓ lead-time meta (no COD)");

  const login = await api("POST", "/api/auth/login", undefined, {
    phone: "255711111111",
    password: "demo1234",
  });
  assert(login.status === 200 && login.json.success, `login failed: ${login.json.error}`);
  const token = login.json.data.token as string;
  const userId = login.json.data.user.id as string;

  const tooSoon = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const reject = await api("POST", "/api/restaurant/social-orders", token, {
    userId,
    dishName: "Ndizi nyama",
    requestedFor: tooSoon,
  });
  assert(reject.status === 400 || reject.status === 422, "expected lead-time rejection");
  console.log("✓ rejects under 2.5h lead time");

  const created = await api("POST", "/api/restaurant/social-orders", token, {
    userId,
    dishName: "Samaki wa kupaka nazi",
    specialRequirements: "Pilipili kwa mbali",
    requestedFor: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
  });
  assert(created.status === 201 && created.json.data.status === "PENDING", `create failed: ${created.json.error}`);
  const id = created.json.data.id as string;
  console.log(`✓ create Social Order RFQ ${id} (no payment)`);

  const adminLogin = await api("POST", "/api/auth/login", undefined, {
    phone: "255700000000",
    password: "admin123",
  });
  assert(adminLogin.status === 200, `admin login failed: ${adminLogin.json.error}`);
  const adminToken = adminLogin.json.data.token as string;

  const quoted = await api("POST", `/api/restaurant/social-orders/${id}/send-quote`, adminToken, {
    quotedPrice: 18500,
  });
  assert(quoted.status === 200 && quoted.json.success, `send-quote failed: ${quoted.json.error}`);
  assert(quoted.json.data.status === "QUOTED", "status should be QUOTED");
  assert(Number(quoted.json.data.quotedPrice) === 18500, "price mismatch");
  assert(quoted.json.data.orderId, "orderId should be created for pay link");
  assert(String(quoted.json.data.payPath).startsWith("/pay/"), "payPath missing");
  console.log("✓ admin Send Price → QUOTED + pay link");

  const orderId = quoted.json.data.orderId as string;
  const order = await api("GET", `/api/orders/${orderId}`, token);
  assert(order.status === 200, `get order failed: ${order.json.error}`);
  assert(order.json.data.paymentTiming === "PAY_NOW", "must be PAY_NOW (no COD)");
  assert(Number(order.json.data.total) === 18500, "order total mismatch");
  console.log("✓ linked Order is PAY_NOW only");

  const kitchenBefore = await api("GET", "/api/restaurant/kitchen", adminToken);
  assert(kitchenBefore.status === 200, "kitchen list failed");
  const inKitchenBefore = (kitchenBefore.json.data as any[]).some((q) => q.orderId === orderId);
  assert(!inKitchenBefore, "must NOT enter kitchen before payment");
  console.log("✓ kitchen empty for unpaid Social Order");

  // Simulate payment confirm path: submit reference then confirm
  const pay = await api("POST", "/api/payments", token, { orderId });
  assert(pay.status === 200 || pay.status === 201, `create payment failed: ${pay.json.error}`);
  const paymentId = pay.json.data.payment.id as string;

  const submit = await api("POST", "/api/payments/submit", token, {
    paymentId,
    reference: `SOC${Date.now().toString().slice(-10)}`,
  });
  assert(submit.status === 200, `submit payment failed: ${submit.json.error}`);

  const confirm = await api("POST", "/api/payments/confirm", adminToken, {
    paymentId,
    action: "confirm",
  });
  assert(confirm.status === 200, `confirm failed: ${confirm.json.error}`);
  console.log("✓ payment confirmed");

  const social = await api("GET", `/api/restaurant/social-orders/${id}`, adminToken);
  assert(social.json.data.status === "PREPARING", `expected PREPARING got ${social.json.data.status}`);
  console.log("✓ Social Order → PREPARING after pay");

  const kitchenAfter = await api("GET", "/api/restaurant/kitchen", adminToken);
  const inKitchenAfter = (kitchenAfter.json.data as any[]).some((q) => q.orderId === orderId);
  assert(inKitchenAfter, "should enter kitchen after payment confirm");
  console.log("✓ kitchen queue after payment");

  console.log("\nAll Social Order RFQ checks passed.");
}

main().catch((err) => {
  console.error("\nFAILED:", err instanceof Error ? err.message : err);
  process.exit(1);
});
