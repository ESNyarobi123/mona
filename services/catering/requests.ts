import {
  prisma,
  type CateringEventType,
  type CateringRequestStatus,
  type Channel,
} from "@monana/db";
import { formatTZS, genOrderRef, paginatedResult, type PaginationParams } from "@monana/utils";
import {
  assertGuestCountForPackage,
  calcCateringPackageTotal,
  getCateringPackageById,
} from "./packages";

/** Events should be planned ahead (hours). */
export const CATERING_MIN_LEAD_HOURS = 48;

const CUSTOMER_CANCELABLE: CateringRequestStatus[] = ["PENDING", "QUOTED"];

export type CreateCateringCustomQuoteInput = {
  userId: string;
  eventType: CateringEventType;
  eventAt: string | Date;
  location: string;
  guestCount: number;
  specialRequirements?: string;
  channel?: Channel;
};

export type CreateCateringPackageBookingInput = CreateCateringCustomQuoteInput & {
  packageId: string;
};

function parseEventAt(value: string | Date): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Tarehe/muda wa tukio si sahihi");
  return date;
}

export function assertCateringLeadTime(eventAt: Date, now = new Date()) {
  const earliest = new Date(now.getTime() + CATERING_MIN_LEAD_HOURS * 60 * 60 * 1000);
  if (eventAt.getTime() < earliest.getTime()) {
    throw new Error(
      `Tukio la catering lipangwe angalau masaa ${CATERING_MIN_LEAD_HOURS} (siku 2) kabla — ili tupate nafasi ya kuandaa.`
    );
  }
}

function buildOrderNote(params: {
  kind: "PACKAGE" | "CUSTOM_QUOTE";
  packageName?: string;
  eventType: string;
  guestCount: number;
  specialRequirements?: string | null;
}) {
  const lines = [
    `Monana Catering (${params.kind === "PACKAGE" ? "Package" : "Custom Quote"})`,
    params.packageName ? `Kifurushi: ${params.packageName}` : null,
    `Aina: ${params.eventType}`,
    `Watu: ${params.guestCount}`,
    params.specialRequirements ? `Mahitaji: ${params.specialRequirements}` : null,
    "Malipo: Lipa sasa tu — oda inathibitishwa baada ya malipo (hakuna COD).",
  ];
  return lines.filter(Boolean).join("\n");
}

async function upsertPayNowOrder(params: {
  existingOrderId: string | null;
  userId: string;
  channel: Channel;
  total: number;
  location: string;
  eventAt: Date;
  note: string;
  itemName: string;
  guestCount: number;
  unitPrice: number;
}) {
  const price = Math.round(params.total);
  let orderId = params.existingOrderId;

  if (orderId) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });
    if (!order) {
      orderId = null;
    } else if (order.payment?.status === "PAID" || order.payment?.status === "AWAITING_CONFIRMATION") {
      throw new Error("Mteja tayari amelipa au ametuma reference — huwezi kubadilisha bei");
    } else {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          module: "CATERING",
          subtotal: price,
          deliveryFee: 0,
          total: price,
          address: params.location,
          note: params.note,
          scheduledFor: params.eventAt,
          paymentTiming: "PAY_NOW",
          status: "PENDING",
        },
      });
      await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          name: params.itemName,
          unit: "PERSON",
          quantity: params.guestCount,
          price: params.unitPrice,
        },
      });
      if (order.payment) {
        await prisma.payment.update({
          where: { id: order.payment.id },
          data: { amount: price, status: "PENDING", reference: genOrderRef() },
        });
      } else {
        await prisma.payment.create({
          data: {
            orderId: order.id,
            userId: params.userId,
            amount: price,
            method: "MANUAL_LIPA_NAMBA",
            status: "PENDING",
            reference: genOrderRef(),
          },
        });
      }
      return orderId;
    }
  }

  const order = await prisma.order.create({
    data: {
      userId: params.userId,
      module: "CATERING",
      channel: params.channel,
      status: "PENDING",
      paymentTiming: "PAY_NOW",
      subtotal: price,
      deliveryFee: 0,
      total: price,
      address: params.location,
      note: params.note,
      scheduledFor: params.eventAt,
      submittedAt: null,
      items: {
        create: [
          {
            name: params.itemName,
            unit: "PERSON",
            quantity: params.guestCount,
            price: params.unitPrice,
          },
        ],
      },
      payment: {
        create: {
          userId: params.userId,
          amount: price,
          method: "MANUAL_LIPA_NAMBA",
          status: "PENDING",
          reference: genOrderRef(),
        },
      },
    },
  });
  return order.id;
}

function payLinks(orderId: string) {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const payPath = `/pay/${orderId}`;
  return { payPath, payUrl: `${appUrl}${payPath}`, priceLabel: "" };
}

const requestInclude = {
  user: { select: { id: true, name: true, phone: true, locale: true } },
  package: true,
} as const;

/** Custom catering — Request for Quote (no price yet). */
export async function createCateringCustomQuote(input: CreateCateringCustomQuoteInput) {
  const location = input.location.trim();
  if (location.length < 3) throw new Error("Andika eneo/anwani ya tukio");
  if (!Number.isInteger(input.guestCount) || input.guestCount < 1) {
    throw new Error("Andika kadirio la idadi ya watu");
  }

  const eventAt = parseEventAt(input.eventAt);
  assertCateringLeadTime(eventAt);

  return prisma.cateringRequest.create({
    data: {
      userId: input.userId,
      kind: "CUSTOM_QUOTE",
      eventType: input.eventType,
      eventAt,
      location,
      guestCount: input.guestCount,
      specialRequirements: input.specialRequirements?.trim() || null,
      channel: input.channel ?? "WEB",
      status: "PENDING",
    },
    include: requestInclude,
  });
}

/**
 * Fixed package booking — total = pricePerHead * guestCount.
 * Creates PAY_NOW order immediately (still unconfirmed until paid).
 */
export async function createCateringPackageBooking(input: CreateCateringPackageBookingInput) {
  const pkg = await getCateringPackageById(input.packageId);
  if (!pkg || !pkg.active) throw new Error("Kifurushi cha catering hakipatikani");

  assertGuestCountForPackage(input.guestCount, pkg.minGuests, pkg.maxGuests);

  const location = input.location.trim();
  if (location.length < 3) throw new Error("Andika eneo/anwani ya tukio");

  const eventAt = parseEventAt(input.eventAt);
  assertCateringLeadTime(eventAt);

  const pricePerHead = Number(pkg.pricePerHead);
  const total = calcCateringPackageTotal(pricePerHead, input.guestCount);
  const note = buildOrderNote({
    kind: "PACKAGE",
    packageName: pkg.nameSw || pkg.nameEn,
    eventType: input.eventType,
    guestCount: input.guestCount,
    specialRequirements: input.specialRequirements,
  });

  const orderId = await upsertPayNowOrder({
    existingOrderId: null,
    userId: input.userId,
    channel: input.channel ?? "WEB",
    total,
    location,
    eventAt,
    note,
    itemName: `${pkg.nameEn} (${input.guestCount} guests)`,
    guestCount: input.guestCount,
    unitPrice: pricePerHead,
  });

  const request = await prisma.cateringRequest.create({
    data: {
      userId: input.userId,
      kind: "PACKAGE",
      packageId: pkg.id,
      eventType: input.eventType,
      eventAt,
      location,
      guestCount: input.guestCount,
      specialRequirements: input.specialRequirements?.trim() || null,
      channel: input.channel ?? "WEB",
      status: "QUOTED",
      pricePerHead,
      quotedPrice: total,
      orderId,
      quotedAt: new Date(),
    },
    include: requestInclude,
  });

  const links = payLinks(orderId);
  return {
    request,
    orderId,
    quotedPrice: total,
    pricePerHead,
    ...links,
    priceLabel: formatTZS(total),
  };
}

/** Admin Send Price for custom quote (or re-quote). */
export async function sendCateringQuote(
  id: string,
  quotedPrice: number,
  adminNote?: string | null
) {
  if (!Number.isFinite(quotedPrice) || quotedPrice <= 0) {
    throw new Error("Weka bei sahihi (mfano 850000)");
  }
  const price = Math.round(quotedPrice);

  const existing = await prisma.cateringRequest.findUnique({
    where: { id },
    include: requestInclude,
  });
  if (!existing) throw new Error("Ombi la catering halipatikani");
  if (!["PENDING", "QUOTED"].includes(existing.status)) {
    throw new Error(`Huwezi kutuma bei wakati status ni ${existing.status}`);
  }

  const packageName = existing.package?.nameSw || existing.package?.nameEn;
  const note = buildOrderNote({
    kind: existing.kind,
    packageName: packageName ?? undefined,
    eventType: existing.eventType,
    guestCount: existing.guestCount,
    specialRequirements: existing.specialRequirements,
  });

  const unitPrice = Math.round(price / Math.max(existing.guestCount, 1));
  const orderId = await upsertPayNowOrder({
    existingOrderId: existing.orderId,
    userId: existing.userId,
    channel: existing.channel,
    total: price,
    location: existing.location,
    eventAt: existing.eventAt,
    note,
    itemName: packageName
      ? `${packageName} (${existing.guestCount} guests)`
      : `Custom Catering — ${existing.eventType} (${existing.guestCount} guests)`,
    guestCount: existing.guestCount,
    unitPrice,
  });

  const request = await prisma.cateringRequest.update({
    where: { id },
    data: {
      status: "QUOTED",
      quotedPrice: price,
      pricePerHead: unitPrice,
      adminNote: adminNote?.trim() || null,
      orderId,
      quotedAt: new Date(),
    },
    include: requestInclude,
  });

  const links = payLinks(orderId);
  return {
    request,
    orderId,
    quotedPrice: price,
    ...links,
    priceLabel: formatTZS(price),
  };
}

/** After payment confirmed — catering order becomes Confirmed. */
export async function markCateringPaidAndConfirm(orderId: string) {
  const request = await prisma.cateringRequest.findFirst({ where: { orderId } });
  if (!request) return null;

  if (["CONFIRMED", "PREPARING", "COMPLETED"].includes(request.status)) {
    return request;
  }

  const updated = await prisma.cateringRequest.update({
    where: { id: request.id },
    data: { status: "CONFIRMED" },
    include: requestInclude,
  });

  await prisma.order.update({
    where: { id: orderId },
    data: { status: "CONFIRMED", submittedAt: new Date() },
  });

  return updated;
}

export async function getCateringRequestById(id: string) {
  return prisma.cateringRequest.findUnique({
    where: { id },
    include: requestInclude,
  });
}

export async function listUserCateringRequests(userId: string, pagination: PaginationParams = {}) {
  const page = pagination.page ?? 1;
  const limit = pagination.limit ?? 20;
  const where = { userId };
  const [total, items] = await Promise.all([
    prisma.cateringRequest.count({ where }),
    prisma.cateringRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: requestInclude,
    }),
  ]);
  return paginatedResult(items, total, page, limit);
}

export async function listCateringRequests(
  filters: { status?: CateringRequestStatus; kind?: "PACKAGE" | "CUSTOM_QUOTE"; q?: string } = {},
  pagination: PaginationParams = {}
) {
  const page = pagination.page ?? 1;
  const limit = pagination.limit ?? 20;
  const q = filters.q?.trim();
  const where = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.kind ? { kind: filters.kind } : {}),
    ...(q
      ? {
          OR: [
            { location: { contains: q, mode: "insensitive" as const } },
            { specialRequirements: { contains: q, mode: "insensitive" as const } },
            { user: { phone: { contains: q } } },
            { user: { name: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [total, items] = await Promise.all([
    prisma.cateringRequest.count({ where }),
    prisma.cateringRequest.findMany({
      where,
      orderBy: [{ status: "asc" }, { eventAt: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: requestInclude,
    }),
  ]);
  return paginatedResult(items, total, page, limit);
}

export async function updateCateringRequestStatus(id: string, status: CateringRequestStatus) {
  if (status === "QUOTED" || status === "CONFIRMED") {
    throw new Error(
      status === "QUOTED"
        ? "Tumia Send Price kutuma bei"
        : "Confirmation inakuja baada ya malipo kuthibitishwa"
    );
  }

  const existing = await prisma.cateringRequest.findUnique({ where: { id } });
  if (!existing) throw new Error("Ombi la catering halipatikani");

  return prisma.cateringRequest.update({
    where: { id },
    data: { status },
    include: requestInclude,
  });
}

export async function cancelCateringRequest(id: string, userId: string) {
  const existing = await prisma.cateringRequest.findUnique({ where: { id } });
  if (!existing) throw new Error("Ombi la catering halipatikani");
  if (existing.userId !== userId) throw new Error("Huna ruhusa");
  if (!CUSTOMER_CANCELABLE.includes(existing.status)) {
    throw new Error("Huwezi kufuta ombi hili sasa");
  }

  if (existing.orderId) {
    const payment = await prisma.payment.findUnique({ where: { orderId: existing.orderId } });
    if (payment && (payment.status === "PAID" || payment.status === "AWAITING_CONFIRMATION")) {
      throw new Error("Huwezi kufuta — malipo yameshatumwa au kuthibitishwa");
    }
    await prisma.order.update({
      where: { id: existing.orderId },
      data: { status: "CANCELLED" },
    });
  }

  return prisma.cateringRequest.update({
    where: { id },
    data: { status: "CANCELLED" },
    include: requestInclude,
  });
}

export function cateringMeta() {
  return {
    minLeadHours: CATERING_MIN_LEAD_HOURS,
    payBeforeConfirm: true,
    cashOnDeliveryAllowed: false,
    eventTypes: ["WEDDING", "SEND_OFF", "CORPORATE", "BIRTHDAY", "FUNERAL", "OTHER"] as const,
    messageSw:
      "Monana Catering: chagua kifurushi (bei kwa kila mtu × idadi) au omba nukuu maalum. Lazima ulipe kabla oda haijathibitishwa — hakuna Cash on Delivery.",
    messageEn:
      "Monana Catering: pick a per-head package or request a custom quote. You must pay before the order is confirmed — no cash on delivery.",
  };
}
