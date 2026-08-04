/**
 * Social-careful Catering API tests: packages, RFQ, pay-before-confirm
 * Usage: npx tsx scripts/test-catering-apis.ts [baseUrl]
 */
const BASE = process.argv[2] ?? "http://localhost:3000";

async function api(method: string, path: string, token?: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
  console.log(`Testing Catering APIs against ${BASE}`);

  const meta = await api("GET", "/api/catering/requests?meta=1");
  assert(meta.json.success && meta.json.data.cashOnDeliveryAllowed === false, "COD must be false");
  assert(meta.json.data.payBeforeConfirm === true, "payBeforeConfirm required");
  console.log("✓ meta");

  const pkgs = await api("GET", "/api/catering/packages");
  assert(pkgs.status === 200 && pkgs.json.data.length >= 3, `packages: ${pkgs.json.error}`);
  const corporate = (pkgs.json.data as any[]).find((p) => p.code === "CORPORATE_LUNCH");
  assert(corporate, "CORPORATE_LUNCH missing — run db:seed");
  console.log(`✓ ${pkgs.json.data.length} packages`);

  const login = await api("POST", "/api/auth/login", undefined, {
    phone: "255711111111",
    password: "demo1234",
  });
  assert(login.json.success, `login: ${login.json.error}`);
  const token = login.json.data.token as string;
  const userId = login.json.data.user.id as string;

  const adminLogin = await api("POST", "/api/auth/login", undefined, {
    phone: "255700000000",
    password: "admin123",
  });
  const adminToken = adminLogin.json.data.token as string;

  const guests = 12;
  const expected = Math.round(Number(corporate.pricePerHead) * guests);
  const booked = await api("POST", "/api/catering/requests", token, {
    userId,
    packageId: corporate.id,
    eventType: "CORPORATE",
    eventAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    location: "Masaki Office Park, Dar",
    guestCount: guests,
    specialRequirements: "Need soft drinks",
  });
  assert(booked.status === 201, `package book: ${booked.json.error}`);
  assert(booked.json.data.status === "QUOTED", "package should be QUOTED with known price");
  assert(Number(booked.json.data.quotedPrice) === expected, `total ${booked.json.data.quotedPrice} != ${expected}`);
  assert(booked.json.data.orderId, "orderId required");
  console.log("✓ package booking auto-total");

  const orderId = booked.json.data.orderId as string;
  const order = await api("GET", `/api/orders/${orderId}`, token);
  assert(order.json.data.module === "CATERING", "module CATERING");
  assert(order.json.data.paymentTiming === "PAY_NOW", "PAY_NOW only");
  assert(order.json.data.status === "PENDING", "unpaid stays PENDING");
  console.log("✓ pay-before-confirm (PENDING until paid)");

  const quote = await api("POST", "/api/catering/requests", token, {
    userId,
    eventType: "WEDDING",
    eventAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    location: "Mikocheni Garden",
    guestCount: 120,
    specialRequirements: "Wahudumu + vishikio vya moto",
  });
  assert(quote.status === 201 && quote.json.data.status === "PENDING", `custom quote: ${quote.json.error}`);
  const quoteId = quote.json.data.id as string;
  console.log("✓ custom quote request PENDING");

  const priced = await api("POST", `/api/catering/requests/${quoteId}/send-quote`, adminToken, {
    quotedPrice: 3500000,
  });
  assert(priced.status === 200 && priced.json.data.status === "QUOTED", `send-quote: ${priced.json.error}`);
  assert(Number(priced.json.data.quotedPrice) === 3500000, "quote price");
  console.log("✓ admin Send Price");

  const pay = await api("POST", "/api/payments", token, { orderId });
  const paymentId = pay.json.data.payment.id as string;
  await api("POST", "/api/payments/submit", token, {
    paymentId,
    reference: `CAT${Date.now().toString().slice(-10)}`,
  });
  const confirm = await api("POST", "/api/payments/confirm", adminToken, {
    paymentId,
    action: "confirm",
  });
  assert(confirm.status === 200, `confirm: ${confirm.json.error}`);

  const after = await api("GET", `/api/catering/requests/${booked.json.data.id}`, token);
  assert(after.json.data.status === "CONFIRMED", `expected CONFIRMED got ${after.json.data.status}`);
  const orderAfter = await api("GET", `/api/orders/${orderId}`, token);
  assert(orderAfter.json.data.status === "CONFIRMED", "order CONFIRMED after pay");
  console.log("✓ confirmed only after payment");

  const mine = await api("GET", `/api/catering/requests?userId=${userId}`, token);
  assert(mine.status === 200 && mine.json.data.items?.length >= 1, `my requests: ${mine.json.error}`);
  console.log(`✓ customer list (${mine.json.data.items.length} items)`);

  const cancelable = await api("POST", "/api/catering/requests", token, {
    userId,
    eventType: "BIRTHDAY",
    eventAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
    location: "Mbezi Beach Hall",
    guestCount: 40,
  });
  assert(cancelable.status === 201, `cancelable quote: ${cancelable.json.error}`);
  const cancelled = await api("DELETE", `/api/catering/requests/${cancelable.json.data.id}`, token);
  assert(cancelled.status === 200 && cancelled.json.data.status === "CANCELLED", `cancel: ${cancelled.json.error}`);
  console.log("✓ customer cancel PENDING quote");

  const code = `TEST_PKG_${Date.now().toString().slice(-6)}`;
  const created = await api("POST", "/api/catering/packages", adminToken, {
    code,
    nameEn: "Test Package",
    nameSw: "Kifurushi cha Jaribio",
    descriptionEn: "Temporary package for API tests.",
    descriptionSw: "Kifurushi cha muda kwa majaribio.",
    pricePerHead: 15000,
    minGuests: 5,
    maxGuests: 15,
    featuresEn: ["Test feature"],
    featuresSw: ["Kipengele cha jaribio"],
    sortOrder: 99,
  });
  assert(created.status === 201 && created.json.data.code === code, `create package: ${created.json.error}`);
  const pkgId = created.json.data.id as string;

  const patched = await api("PATCH", `/api/catering/packages/${pkgId}`, adminToken, {
    pricePerHead: 16000,
    active: true,
  });
  assert(patched.status === 200 && Number(patched.json.data.pricePerHead) === 16000, `patch: ${patched.json.error}`);

  const softDel = await api("DELETE", `/api/catering/packages/${pkgId}`, adminToken);
  assert(softDel.status === 200 && softDel.json.data.active === false, `soft-delete: ${softDel.json.error}`);

  const publicPkgs = await api("GET", "/api/catering/packages");
  assert(!(publicPkgs.json.data as any[]).some((p) => p.id === pkgId), "inactive package hidden from public");
  console.log("✓ admin package CRUD (create/patch/soft-delete)");

  const adminList = await api("GET", "/api/catering/requests?kind=CUSTOM_QUOTE", adminToken);
  assert(adminList.status === 200, `admin kind filter: ${adminList.json.error}`);
  console.log("✓ admin kind filter");

  console.log("\nAll Catering API checks passed.");
}

main().catch((err) => {
  console.error("\nFAILED:", err instanceof Error ? err.message : err);
  process.exit(1);
});
