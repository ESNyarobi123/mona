import { prisma, type SubscriptionFrequency } from "@monana/db";
import type { AppLocale } from "@monana/i18n";
import {
  MEMBERSHIP_PLANS,
  MAX_MEMBERSHIP_DISCOUNT_PERCENT,
  weeklyDeliveryDays,
  dayOfWeekLabel,
  membershipPlanTitle,
  packageKindLabel,
} from "@monana/utils";
import {
  type PackageItem,
  resolveLineItemsWithTotal,
  pricingForSubscription,
  pricingForPackageBasket,
  assertBasketMeetsPackageMinimums,
  parsePackageItems,
  frequencyForPackageKind,
} from "./subscription-engine";

/** Admin-defined packages for WhatsApp / store (excludes auto shell membership packages). */
export async function getStorePackages(locale: AppLocale = "en") {
  const rows = await prisma.groceryPackage.findMany({
    where: { active: true, price: { gt: 0 } },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
  });
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    kind: p.kind,
    price: Number(p.price),
    frequency: frequencyForPackageKind(p.kind),
    discountPercent: Number(p.discountPercent ?? 0),
    freeDelivery: p.freeDelivery,
    kindLabel: packageKindLabel(p.kind, locale).title,
  }));
}

/** Single payload for WhatsApp grocery hub — packages + subscription state. */
export async function getGroceryStoreHome(userId: string, locale: AppLocale = "en") {
  const [packages, subs] = await Promise.all([
    getStorePackages(locale),
    prisma.grocerySubscription.findMany({
      where: { userId },
      include: {
        package: true,
        orders: {
          take: 5,
          orderBy: { createdAt: "desc" },
          include: { payment: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const active = subs.find((s) => s.status === "ACTIVE");
  const paused = subs.find((s) => s.status === "PAUSED");
  const pending = subs.find((s) => s.status === "PENDING_PAYMENT");
  const primary = active ?? paused ?? pending ?? null;

  let pendingPayment: { orderId: string; paymentId: string; amount: string } | null = null;
  if (pending) {
    const order = pending.orders.find(
      (o) => o.payment && o.payment.status !== "PAID" && o.status !== "CANCELLED"
    );
    if (order?.payment) {
      pendingPayment = {
        orderId: order.id,
        paymentId: order.payment.id,
        amount: String(order.total),
      };
    }
  }

  return {
    packages,
    subscription: primary
      ? {
          id: primary.id,
          status: primary.status,
          frequency: primary.frequency,
          packageName: primary.package.name,
          nextRunAt: primary.nextRunAt?.toISOString() ?? null,
          address: primary.address,
        }
      : null,
    pendingPayment,
    canEnroll: !active && !pending,
  };
}

async function fetchGroceryCatalog(categoryId?: string) {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { module: "GROCERY", available: true, ...(categoryId ? { categoryId } : {}) },
      include: { category: true },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({
      where: { module: "GROCERY" },
      include: { _count: { select: { products: true, menuItems: true } } },
      orderBy: { name: "asc" },
    }),
  ]);
  return { products, categories };
}

/** Machaguo mawili makuu — mteja anapoingia Grocery store */
export function getGroceryStoreEntry() {
  return {
    module: "GROCERY" as const,
    paths: [
      {
        id: "MEMBERSHIP",
        title: "Jiunge na Uanachama wa Kila Wiki/Mwezi",
        subtitle: `Okoa hadi ${MAX_MEMBERSHIP_DISCOUNT_PERCENT}%`,
        description: "Chagua siku ya kupokea mzigo na kikapu chako cha msingi kinachojirudia",
        cta: "Anza uanachama",
        api: {
          setup: "/api/grocery/store/membership",
          preview: "/api/grocery/store/membership/preview",
          enroll: "/api/grocery/store/membership",
        },
        maxDiscountPercent: MAX_MEMBERSHIP_DISCOUNT_PERCENT,
      },
      {
        id: "ON_DEMAND",
        title: "Nunua kwa Oda ya Sasa Hivi tu",
        subtitle: "Hakuna usajili — oda moja ya papo kwa papo",
        description: "Chagua bidhaa kutoka dukani, weka oda na ulipie sasa",
        cta: "Nunua sasa",
        api: {
          catalog: "/api/grocery/store/on-demand",
          createOrder: "/api/orders",
        },
      },
    ],
    steps: {
      membership: [
        { step: 1, key: "plan", label: "Chagua wiki au mwezi" },
        { step: 2, key: "deliveryDay", label: "Chagua siku ya kupokea mzigo" },
        { step: 3, key: "defaultBasket", label: "Chagua bidhaa za msingi (kikapu kinachojirudia)" },
        { step: 4, key: "address", label: "Anwani na malipo ya mbele" },
      ],
      onDemand: [
        { step: 1, key: "catalog", label: "Chagua bidhaa" },
        { step: 2, key: "checkout", label: "Maliza oda" },
      ],
    },
  };
}

/** Data ya kuanzisha flow ya uanachama */
export async function getMembershipSetup(locale: AppLocale = "en") {
  const { products, categories } = await fetchGroceryCatalog();

  return {
    plans: Object.values(MEMBERSHIP_PLANS).map((p) => ({
      id: p.id,
      title: p.title[locale],
      label: p.label[locale],
      discountPercent: p.discountPercent,
      freeDelivery: p.freeDelivery,
      badge:
        p.discountPercent > 0
          ? p.freeDelivery
            ? locale === "sw"
              ? `Okoa ${p.discountPercent}% + uwasilishaji bure`
              : `Save ${p.discountPercent}% + free delivery`
            : locale === "sw"
              ? `Okoa ${p.discountPercent}%`
              : `Save ${p.discountPercent}%`
          : null,
    })),
    deliveryDays: {
      weekly: weeklyDeliveryDays(locale),
      monthly: {
        hint:
          locale === "sw"
            ? "Chagua siku ya mwezi (1–28) utakayopokea mzigo"
            : "Choose a day of the month (1–28) for delivery",
        examples: [
          { value: 1, label: locale === "sw" ? "Tarehe 1" : "Day 1" },
          { value: 15, label: locale === "sw" ? "Tarehe 15" : "Day 15" },
        ],
      },
    },
    products,
    categories,
    rules: {
      minBasketItems: 1,
      orderCutoffHours: 48,
      upfrontPaymentRequired: true,
    },
  };
}

/** Orodha ya bidhaa kwa oda ya papo kwa papo */
export async function getOnDemandCatalog(categoryId?: string) {
  const { products, categories } = await fetchGroceryCatalog(categoryId);
  return {
    orderType: "ON_DEMAND" as const,
    products,
    categories,
    createOrder: {
      method: "POST",
      path: "/api/orders",
      body: {
        module: "GROCERY",
        items: [{ productId: "...", quantity: 1 }],
        address: "Anwani ya kufikishia",
      },
    },
  };
}

export async function previewMembershipBasket(
  plan: "WEEKLY" | "MONTHLY",
  items: PackageItem[],
  locale: AppLocale = "en",
  packageId?: string
) {
  let pricing: Awaited<ReturnType<typeof pricingForSubscription>>;
  let planLabel = membershipPlanTitle(plan, locale);

  if (packageId) {
    const pkg = await prisma.groceryPackage.findUnique({ where: { id: packageId } });
    if (!pkg || !pkg.active || Number(pkg.price) <= 0) {
      throw new Error("Kifurushi haipatikani au hauko hai");
    }
    const minimums = parsePackageItems(pkg.items);
    assertBasketMeetsPackageMinimums(items, minimums);
    if (frequencyForPackageKind(pkg.kind) !== plan) {
      throw new Error("Mpango haukilingani na kifurushi");
    }
    pricing = await pricingForPackageBasket(pkg, items);
    planLabel = pkg.name;
  } else {
    pricing = await pricingForSubscription(plan, items);
  }

  const lineItems = await resolveLineItemsWithTotal(items);

  return {
    plan,
    planLabel,
    deliveryDayHint:
      plan === "WEEKLY"
        ? locale === "sw"
          ? "Utachagua siku (mf. Kila Jumamosi) hatua inayofuata"
          : "You will pick a delivery day next (e.g. every Saturday)"
        : locale === "sw"
          ? "Utachagua tarehe ya mwezi hatua inayofuata"
          : "You will pick a day of the month next",
    items: lineItems.items.map((it) => ({
      name: it.name,
      quantity: Number(it.quantity),
      lineTotal: Math.round(it.price * Number(it.quantity)),
    })),
    pricing,
    message:
      pricing.discountAmount > 0 || pricing.freeDelivery
        ? (locale === "sw" ? "Malipo ya mbele" : "Upfront payment") +
          `: TZS ${pricing.total.toLocaleString()}` +
          (pricing.discountPercent
            ? locale === "sw"
              ? ` (punguzo ${pricing.discountPercent}%)`
              : ` (${pricing.discountPercent}% off)`
            : "") +
          (pricing.freeDelivery ? (locale === "sw" ? " · Uwasilishaji BURE" : " · FREE delivery") : "")
        : locale === "sw"
          ? "Malipo ya mbele yanahitajika kabla ya huduma kuanza"
          : "Upfront payment is required before service starts",
  };
}

/** Shell package kwa uanachama wa mteja (bei inahesabiwa kutoka kikapu) */
export async function getMembershipShellPackage(plan: "WEEKLY" | "MONTHLY") {
  const kind = plan === "WEEKLY" ? "WEEKLY_BASKET" : "MONTHLY_PANTRY";
  const name = plan === "WEEKLY" ? "Uanachama — Kila Wiki" : "Uanachama — Kila Mwezi";
  const planMeta = MEMBERSHIP_PLANS[plan];

  let pkg = await prisma.groceryPackage.findFirst({
    where: { name, kind, active: true },
  });

  if (!pkg) {
    pkg = await prisma.groceryPackage.create({
      data: {
        name,
        description: "Kikapu cha mteja — bei inahesabiwa kutoka bidhaa alizochagua",
        kind,
        price: 0,
        items: [],
        discountPercent: planMeta.discountPercent,
        freeDelivery: planMeta.freeDelivery,
        orderCutoffHours: 48,
        deliveriesPerMonth: plan === "MONTHLY" ? 2 : 1,
      },
    });
  }

  return pkg;
}

export function deliveryDayLabel(
  plan: SubscriptionFrequency,
  preferredDayOfWeek?: number | null,
  preferredDayOfMonth?: number | null,
  locale: AppLocale = "en"
) {
  if (plan === "WEEKLY" && preferredDayOfWeek != null) {
    return locale === "sw"
      ? `Kila ${dayOfWeekLabel(preferredDayOfWeek, "sw")}`
      : `Every ${dayOfWeekLabel(preferredDayOfWeek, "en")}`;
  }
  if (plan === "MONTHLY" && preferredDayOfMonth != null) {
    return locale === "sw"
      ? `Tarehe ${preferredDayOfMonth} kila mwezi`
      : `Day ${preferredDayOfMonth} of each month`;
  }
  return null;
}
