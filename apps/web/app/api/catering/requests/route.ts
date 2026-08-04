import {
  cateringMeta,
  createCateringCustomQuote,
  createCateringPackageBooking,
  listCateringRequests,
  listUserCateringRequests,
} from "@monana/catering";
import {
  cateringRequestStatusSchema,
  createCateringCustomQuoteSchema,
  createCateringPackageBookingSchema,
} from "@monana/types";
import { parsePagination } from "@monana/utils";
import { prisma } from "@monana/db";
import { z } from "zod";

type CateringRequestStatus = z.infer<typeof cateringRequestStatusSchema>;
import { handle, ok, parseBody } from "../../../../lib/api";
import {
  ApiError,
  getAuth,
  isBotChannel,
  requireAdmin,
  requireSelfAdminOrBot,
} from "../../../../lib/auth";
import {
  notifyAdminCateringRequest,
  notifyCustomerCateringQuote,
} from "../../../../lib/whatsapp";

const createBodySchema = z.union([
  createCateringPackageBookingSchema,
  createCateringCustomQuoteSchema,
]);

// GET /api/catering/requests?meta=1 | ?userId= | admin list
export function GET(req: Request) {
  return handle(async () => {
    const url = new URL(req.url);
    if (url.searchParams.get("meta") === "1") {
      return ok(cateringMeta());
    }

    const pagination = parsePagination(url.searchParams);
    const userId = url.searchParams.get("userId");
    if (userId) {
      requireSelfAdminOrBot(req, userId);
      return ok(await listUserCateringRequests(userId, pagination));
    }

    requireAdmin(req);
    const statusRaw = url.searchParams.get("status");
    const status: CateringRequestStatus | undefined = statusRaw
      ? cateringRequestStatusSchema.parse(statusRaw)
      : undefined;
    const kind = url.searchParams.get("kind") as "PACKAGE" | "CUSTOM_QUOTE" | null;
    const q = url.searchParams.get("q") ?? undefined;
    return ok(
      await listCateringRequests(
        { status, kind: kind ?? undefined, q },
        pagination
      )
    );
  });
}

// POST /api/catering/requests — package booking or custom quote
export function POST(req: Request) {
  return handle(async () => {
    const raw = await req.json().catch(() => {
      throw new ApiError("Body si JSON sahihi", 400);
    });
    const input = createBodySchema.parse(raw);

    const auth = getAuth(req);
    if (auth && auth.role !== "ADMIN" && auth.sub !== input.userId) {
      throw new ApiError("Huwezi kuunda ombi kwa mtumiaji mwingine", 403);
    }
    if (!auth && !isBotChannel(req)) {
      throw new ApiError("Ingia kwanza", 401);
    }

    const user = await prisma.user.findUnique({ where: { id: input.userId } });
    if (!user) throw new ApiError("Mtumiaji hajapatikani", 404);

    const specialRequirements = input.specialRequirements || undefined;

    if ("packageId" in input && input.packageId) {
      const booked = await createCateringPackageBooking({
        ...input,
        packageId: input.packageId,
        specialRequirements,
      });

      void notifyAdminCateringRequest({
        id: booked.request.id,
        kind: "PACKAGE",
        eventType: booked.request.eventType,
        eventAt: booked.request.eventAt,
        location: booked.request.location,
        guestCount: booked.request.guestCount,
        packageName: booked.request.package?.nameSw ?? booked.request.package?.nameEn,
        quotedPrice: booked.quotedPrice,
        specialRequirements: booked.request.specialRequirements,
        customer: booked.request.user ?? user,
      });

      if (booked.request.user?.phone || user.phone) {
        void notifyCustomerCateringQuote({
          phone: booked.request.user?.phone ?? user.phone,
          label: booked.request.package?.nameSw ?? booked.request.package?.nameEn ?? "Package",
          quotedPrice: booked.quotedPrice,
          payUrl: booked.payUrl,
          locale: booked.request.user?.locale ?? user.locale,
        });
      }

      return ok(
        {
          ...booked.request,
          payUrl: booked.payUrl,
          payPath: booked.payPath,
          priceLabel: booked.priceLabel,
          orderId: booked.orderId,
        },
        201
      );
    }

    const quote = await createCateringCustomQuote({
      ...input,
      specialRequirements,
    });

    void notifyAdminCateringRequest({
      id: quote.id,
      kind: "CUSTOM_QUOTE",
      eventType: quote.eventType,
      eventAt: quote.eventAt,
      location: quote.location,
      guestCount: quote.guestCount,
      specialRequirements: quote.specialRequirements,
      customer: quote.user ?? user,
    });

    return ok(quote, 201);
  });
}
