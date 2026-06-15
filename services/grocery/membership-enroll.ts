import { prisma, type Channel, type SubscriptionFrequency } from "@monana/db";
import { MEMBERSHIP_PLANS } from "@monana/utils";
import {
  computeNextRunAt,
  createSubscriptionPrepayOrder,
  parsePackageItems,
  type PackageItem,
  pricingForSubscription,
  pricingForPackageBasket,
  assertBasketMeetsPackageMinimums,
  resolveLineItemsWithTotal,
  frequencyForPackageKind,
  validateSubscriptionSchedule,
} from "./subscription-engine";
import { getMembershipShellPackage, deliveryDayLabel } from "./customer-store";
import { assertCanEnrollNewSubscription } from "./subscription-guard";

export async function enrollCustomerMembership(data: {
  userId: string;
  plan: "WEEKLY" | "MONTHLY";
  address: string;
  channel?: Channel;
  preferredDayOfWeek?: number;
  preferredDayOfMonth?: number;
  defaultBasket: PackageItem[];
  packageId?: string;
  note?: string;
  startNow?: boolean;
}) {
  const user = await prisma.user.findUnique({ where: { id: data.userId } });
  if (!user) throw new Error("User not found");

  await assertCanEnrollNewSubscription(data.userId);

  const locale = (user.locale === "sw" ? "sw" : "en") as "en" | "sw";

  parsePackageItems(data.defaultBasket);
  await resolveLineItemsWithTotal(data.defaultBasket);

  const frequency: SubscriptionFrequency = data.plan;
  const planMeta = MEMBERSHIP_PLANS[data.plan];

  let packageId: string;
  let deliveriesPerMonth: number;
  let secondaryDayOfMonth: number | null;
  let pricing: Awaited<ReturnType<typeof pricingForSubscription>>;

  if (data.packageId) {
    const pkg = await prisma.groceryPackage.findUnique({ where: { id: data.packageId } });
    if (!pkg || !pkg.active || Number(pkg.price) <= 0) {
      throw new Error("Kifurushi haipatikani au hauko hai");
    }
    const minimums = parsePackageItems(pkg.items);
    if (!minimums.length) throw new Error("Kifurushi hiki halina bidhaa za msingi");
    assertBasketMeetsPackageMinimums(data.defaultBasket, minimums);
    if (frequencyForPackageKind(pkg.kind) !== data.plan) {
      throw new Error("Mpango haukilingani na kifurushi");
    }
    validateSubscriptionSchedule(pkg, data);

    packageId = pkg.id;
    deliveriesPerMonth = pkg.kind === "MONTHLY_PANTRY" ? pkg.deliveriesPerMonth : 1;
    secondaryDayOfMonth = data.plan === "MONTHLY" && deliveriesPerMonth >= 2 ? 15 : null;
    pricing = await pricingForPackageBasket(pkg, data.defaultBasket);
  } else {
    const shell = await getMembershipShellPackage(data.plan);
    packageId = shell.id;
    deliveriesPerMonth = data.plan === "MONTHLY" ? shell.deliveriesPerMonth : 1;
    secondaryDayOfMonth = data.plan === "MONTHLY" && deliveriesPerMonth >= 2 ? 15 : null;
    pricing = await pricingForSubscription(data.plan, data.defaultBasket);
  }

  const firstRun = computeNextRunAt({
    frequency,
    from: new Date(),
    preferredDayOfWeek: data.preferredDayOfWeek,
    preferredDayOfMonth: data.preferredDayOfMonth,
    secondaryDayOfMonth,
    deliveriesPerMonth,
  });

  const scheduledFor = data.startNow ? new Date() : firstRun;

  const subscription = await prisma.grocerySubscription.create({
    data: {
      userId: data.userId,
      packageId,
      frequency,
      status: "PENDING_PAYMENT",
      address: data.address,
      channel: data.channel ?? "WEB",
      preferredDayOfWeek: data.plan === "WEEKLY" ? data.preferredDayOfWeek : null,
      preferredDayOfMonth: data.plan === "MONTHLY" ? data.preferredDayOfMonth : null,
      secondaryDayOfMonth,
      deliveriesPerMonth,
      defaultBasket: data.defaultBasket,
      note: data.note,
      nextRunAt: firstRun,
    },
    include: { package: true, user: { select: { id: true, name: true, phone: true } } },
  });

  const delivery = await createSubscriptionPrepayOrder(subscription.id, {
    scheduledFor,
    skipDuplicateCheck: true,
  });

  const updated = await prisma.grocerySubscription.findUnique({
    where: { id: subscription.id },
    include: { package: true, user: { select: { id: true, name: true, phone: true } } },
  });

  return {
    subscription: updated!,
    firstOrder: delivery.order,
    firstPayment: delivery.payment,
    pricing,
    deliverySchedule: deliveryDayLabel(
      frequency,
      data.preferredDayOfWeek,
      data.preferredDayOfMonth,
      locale
    ),
    message:
      `${locale === "sw" ? "Uanachama" : "Membership"} ${planMeta.label[locale]} — ${deliveryDayLabel(frequency, data.preferredDayOfWeek, data.preferredDayOfMonth, locale) ?? ""}. ` +
      (pricing.discountAmount > 0 || pricing.freeDelivery
        ? (locale === "sw" ? "Malipo ya mbele" : "Upfront") +
          `: TZS ${pricing.total.toLocaleString()}` +
          (pricing.discountPercent
            ? locale === "sw"
              ? ` (punguzo ${pricing.discountPercent}%)`
              : ` (${pricing.discountPercent}% off)`
            : "") +
          (pricing.freeDelivery
            ? locale === "sw"
              ? " + uwasilishaji BURE"
              : " + FREE delivery"
            : "")
        : locale === "sw"
          ? "Lipa kabla ya huduma kuanza"
          : "Pay before service starts"),
  };
}
