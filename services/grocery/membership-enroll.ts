import { prisma, type Channel, type SubscriptionFrequency } from "@monana/db";
import { MEMBERSHIP_PLANS } from "@monana/utils";
import {
  computeNextRunAt,
  createSubscriptionPrepayOrder,
  parsePackageItems,
  type PackageItem,
  pricingForSubscription,
  resolveLineItemsWithTotal,
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
  const shell = await getMembershipShellPackage(data.plan);

  const deliveriesPerMonth = data.plan === "MONTHLY" ? shell.deliveriesPerMonth : 1;

  const firstRun = computeNextRunAt({
    frequency,
    from: new Date(),
    preferredDayOfWeek: data.preferredDayOfWeek,
    preferredDayOfMonth: data.preferredDayOfMonth,
    secondaryDayOfMonth: data.plan === "MONTHLY" && deliveriesPerMonth >= 2 ? 15 : null,
    deliveriesPerMonth,
  });

  const scheduledFor = data.startNow ? new Date() : firstRun;
  const pricing = await pricingForSubscription(data.plan, data.defaultBasket);

  const subscription = await prisma.grocerySubscription.create({
    data: {
      userId: data.userId,
      packageId: shell.id,
      frequency,
      status: "PENDING_PAYMENT",
      address: data.address,
      channel: data.channel ?? "WEB",
      preferredDayOfWeek: data.plan === "WEEKLY" ? data.preferredDayOfWeek : null,
      preferredDayOfMonth: data.plan === "MONTHLY" ? data.preferredDayOfMonth : null,
      secondaryDayOfMonth: data.plan === "MONTHLY" && deliveriesPerMonth >= 2 ? 15 : null,
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
