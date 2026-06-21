import { z } from "zod";

// Shared zod schemas — backend is ONE; modules are RESTAURANT | GROCERY.

export const phoneSchema = z
  .string()
  .min(9, "Namba ya simu si sahihi")
  .transform((v) => v.replace(/\D/g, ""));

export const registerSchema = z.object({
  phone: phoneSchema,
  name: z.string().min(2, "Jina ni lazima").optional(),
  password: z.string().min(4).optional(),
  email: z.string().email().optional(),
});

/** Web signup — name + password required */
export const registerWebSchema = z.object({
  phone: phoneSchema,
  name: z.string().min(2, "Jina ni lazima"),
  password: z.string().min(6, "Password lazima iwe angalau herufi 6"),
  email: z.string().email().optional(),
  locale: z.enum(["en", "sw"]).optional().default("en"),
});

export const checkPhoneSchema = z.object({
  phone: phoneSchema,
});

export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(4).optional(),
});

/** Restaurant = RESTAURANT, Grocery = GROCERY */
export const businessModuleSchema = z.enum(["RESTAURANT", "GROCERY"]);

/** @deprecated use businessModuleSchema — kept for bot/API aliases */
export const orderTypeSchema = businessModuleSchema;

export const mealSlotSchema = z.enum(["BREAKFAST", "LUNCH", "DINNER"]);

export const mealSlotWindowSchema = z.object({
  slot: mealSlotSchema,
  startHour: z.number().int().min(0).max(23),
  startMinute: z.number().int().min(0).max(59),
  endHour: z.number().int().min(0).max(23),
  endMinute: z.number().int().min(0).max(59),
  endsAtMidnight: z.boolean().optional(),
});

export const updateMealSlotWindowsSchema = z.object({
  windows: z.array(mealSlotWindowSchema).length(3),
});

export const channelSchema = z.enum(["WEB", "WHATSAPP"]);

export const orderStatusSchema = z.enum([
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "ON_THE_WAY",
  "DELIVERED",
  "CANCELLED",
]);

export const unitCodeSchema = z
  .string()
  .min(1)
  .max(24)
  .regex(/^[A-Z][A-Z0-9_]*$/, "Unit code must be uppercase letters, numbers, or underscores");

/** @deprecated use unitCodeSchema — kept for backwards-compatible imports */
export const saleUnitSchema = unitCodeSchema;

function sanitizeUnitCodeInput(val: unknown): string | undefined {
  if (typeof val !== "string" || val.trim() === "") return undefined;
  const trimmed = val.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "");
  if (!trimmed || !/^[A-Z][A-Z0-9_]*$/.test(trimmed)) return undefined;
  return trimmed;
}

export const createUnitSchema = z.object({
  code: z.preprocess(sanitizeUnitCodeInput, unitCodeSchema.optional()),
  labelEn: z.string().trim().min(1, "Jina la Kiingereza linahitajika").max(64),
  labelSw: z.string().trim().min(1, "Jina la Kiswahili linahitajika").max(64),
  priceSuffix: z.string().trim().min(1, "Kiambishi cha bei kinahitajika").max(24),
  quantitySuffixEn: z.string().max(24).optional(),
  quantitySuffixSw: z.string().max(24).optional(),
  icon: z.string().max(8).optional(),
  module: businessModuleSchema.nullable().optional(),
  active: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

export const updateUnitSchema = createUnitSchema.partial().omit({ code: true });

/** Grocery tier: papo kwa papo vs subscription */
export const groceryOrderTypeSchema = z.enum(["ON_DEMAND", "SUBSCRIPTION"]);

export const cartItemSchema = z.object({
  productId: z.string().optional(),
  menuItemId: z.string().optional(),
  /** Supports decimals for KG (e.g. 0.5, 1.5) */
  quantity: z.coerce.number().positive().default(1),
});

export const paymentTimingSchema = z.enum(["PAY_NOW", "PAY_ON_DELIVERY"]);

export const createOrderSchema = z
  .object({
    userId: z.string().min(1),
    module: businessModuleSchema,
    channel: channelSchema.default("WEB"),
    items: z.array(cartItemSchema).min(1, "Oda lazima iwe na bidhaa angalau moja"),
    address: z.string().optional(),
    note: z.string().optional(),
    mealSlot: mealSlotSchema.optional(),
    subscriptionId: z.string().optional(),
    scheduledFor: z.string().datetime().optional(),
    paymentTiming: paymentTimingSchema.default("PAY_NOW"),
  })
  .superRefine((data, ctx) => {
    if (data.module === "GROCERY" && !data.subscriptionId && !data.scheduledFor) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Chagua siku ya kupokea mzigo (Jumatano au Jumamosi)",
        path: ["scheduledFor"],
      });
    }
    if (!data.subscriptionId) {
      const address = data.address?.trim() ?? "";
      if (address.length < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Andika anwani kamili ya kufikishia",
          path: ["address"],
        });
      }
      const note = data.note?.trim() ?? "";
      if (note.length < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Andika maelezo ya ziada (mlango, rangi ya nyumba, jina la mlango…)",
          path: ["note"],
        });
      }
    }
  });

export const updateOrderStatusSchema = z.object({
  orderId: z.string().min(1),
  status: orderStatusSchema,
});

export const createPaymentSchema = z
  .object({
    orderId: z.string().min(1).optional(),
    intentId: z.string().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.orderId && !data.intentId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "orderId au intentId inahitajika",
        path: ["intentId"],
      });
    }
  });

export const submitPaymentSchema = z
  .object({
    paymentId: z.string().min(1).optional(),
    intentId: z.string().min(1).optional(),
    reference: z.string().min(1, "Reference ya malipo ni lazima"),
  })
  .superRefine((data, ctx) => {
    if (!data.paymentId && !data.intentId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "paymentId au intentId inahitajika",
        path: ["intentId"],
      });
    }
    if (data.paymentId && data.intentId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Tuma paymentId au intentId, si zote mbili",
        path: ["intentId"],
      });
    }
  });

export const confirmPaymentSchema = z.object({
  paymentId: z.string().min(1),
});

export const requestOrderPaymentSchema = z.object({
  reference: z.string().min(1, "Reference ya malipo ni lazima"),
});

export const platformSettingsSchema = z.object({
  adminWhatsappNumber: z.string().min(9).optional(),
  lipaNamba: z.string().min(1).optional(),
  lipaNambaName: z.string().min(1).optional(),
});

export const landingTickerSettingsSchema = z.object({
  showOrderCounts: z.boolean().optional(),
  orderBoostBySlot: z
    .object({
      BREAKFAST: z.number().int().min(0).max(9999).optional(),
      LUNCH: z.number().int().min(0).max(9999).optional(),
      DINNER: z.number().int().min(0).max(9999).optional(),
    })
    .optional(),
});

export const hotPickModeSchema = z.enum(["AUTO", "MANUAL"]);

export const hotProductsConfigSchema = z.object({
  module: businessModuleSchema,
  enabled: z.boolean().optional(),
  mode: hotPickModeSchema.optional(),
  maxItems: z.coerce.number().int().min(1).max(20).optional(),
  lookbackDays: z.coerce.number().int().min(7).max(365).optional(),
});

export const createHotPickSchema = z
  .object({
    module: businessModuleSchema,
    productId: z.string().optional(),
    menuItemId: z.string().optional(),
    badge: z.string().max(32).optional(),
    sortOrder: z.coerce.number().int().min(0).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.module === "GROCERY" && !data.productId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "productId required for GROCERY", path: ["productId"] });
    }
    if (data.module === "RESTAURANT" && !data.menuItemId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "menuItemId required for RESTAURANT", path: ["menuItemId"] });
    }
  });

export const updateHotPickSchema = z
  .object({
    badge: z.string().max(32).nullable().optional(),
    sortOrder: z.coerce.number().int().min(0).optional(),
    active: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, "Change at least one field");

export const reorderHotPicksSchema = z.object({
  module: businessModuleSchema,
  orderedIds: z.array(z.string().min(1)).min(1),
});

export const toggleHotPickSchema = z
  .object({
    module: businessModuleSchema,
    productId: z.string().optional(),
    menuItemId: z.string().optional(),
    hot: z.boolean(),
    badge: z.string().max(32).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.module === "GROCERY" && !data.productId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "productId required for GROCERY", path: ["productId"] });
    }
    if (data.module === "RESTAURANT" && !data.menuItemId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "menuItemId required for RESTAURANT", path: ["menuItemId"] });
    }
  });

export const notificationTestSchema = z.object({
  templateId: z.enum([
    "admin_new_user",
    "admin_new_order_restaurant",
    "admin_new_order_grocery",
    "admin_payment_submitted",
    "admin_payment_confirmed",
    "customer_order_received",
    "customer_payment_confirmed",
    "customer_payment_rejected",
  ]),
});

export const categorySchema = z.object({
  name: z.string().min(1),
  module: businessModuleSchema.default("GROCERY"),
});

/** Absolute https URL or locally uploaded path under /uploads/ */
export const catalogImageUrlSchema = z
  .string()
  .refine((v) => v === "" || v.startsWith("/uploads/") || /^https?:\/\//i.test(v), {
    message: "Image must be https:// URL or /uploads/ path",
  });

export const groceryProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  unit: unitCodeSchema.default("PIECE"),
  imageUrl: catalogImageUrlSchema.optional().or(z.literal("")),
  categoryId: z.string().optional(),
  available: z.boolean().default(true),
  inStock: z.boolean().default(true),
});

export const packageKindSchema = z.enum(["WEEKLY_BASKET", "MONTHLY_PANTRY"]);

export const groceryPackageSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  kind: packageKindSchema.default("WEEKLY_BASKET"),
  price: z.number().positive(),
  items: z.array(z.object({ productId: z.string(), quantity: z.number().positive() })).min(1),
  deliveriesPerMonth: z.coerce.number().int().min(1).max(2).default(1),
  discountPercent: z.coerce.number().min(0).max(100).default(0),
  freeDelivery: z.boolean().default(false),
  orderCutoffHours: z.coerce.number().int().min(12).max(168).default(48),
  active: z.boolean().default(true),
});

export const createSubscriptionSchema = z.object({
  userId: z.string().min(1),
  packageId: z.string().min(1),
  frequency: z.enum(["WEEKLY", "MONTHLY"]).optional(),
  address: z.string().min(3, "Anwani ya kufikishia ni lazima"),
  channel: channelSchema.default("WEB"),
  preferredDayOfWeek: z.coerce
    .number()
    .int()
    .refine((d) => d === 3 || d === 6, { message: "Chagua Jumatano au Jumamosi pekee" })
    .optional(),
  preferredDayOfMonth: z.coerce.number().int().min(1).max(28).optional(),
  secondaryDayOfMonth: z.coerce.number().int().min(1).max(28).optional(),
  scheduledDeliveryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Tarehe ya utoaji si sahihi")
    .optional(),
  note: z.string().optional(),
  startNow: z.boolean().default(false),
});

const defaultBasketSchema = z
  .array(z.object({ productId: z.string(), quantity: z.number().positive() }))
  .min(1, "Chagua angalau bidhaa moja kwenye kikapu chako cha msingi");

const groceryDayOfWeekSchema = z.coerce.number().int().refine((d) => d === 3 || d === 6, {
  message: "Chagua Jumatano au Jumamosi pekee",
});

/** Mteja: jiunge na uanachama + kikapu cha msingi */
export const enrollMembershipSchema = z
  .object({
    userId: z.string().min(1),
    plan: z.enum(["WEEKLY", "MONTHLY"]),
    address: z.string().min(3, "Anwani ya kufikishia ni lazima"),
    channel: channelSchema.default("WEB"),
    /** Wiki: siku ya kurudia (3=Jumatano, 6=Jumamosi) */
    preferredDayOfWeek: groceryDayOfWeekSchema.optional(),
    /** Wiki: tarehe halisi ya utoaji wa kwanza (YYYY-MM-DD) */
    scheduledDeliveryDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Tarehe ya utoaji si sahihi")
      .optional(),
    /** @deprecated mwezi sasa unatumia preferredDayOfWeek */
    preferredDayOfMonth: z.coerce.number().int().min(1).max(28).optional(),
    defaultBasket: defaultBasketSchema,
    packageId: z.string().min(1).optional(),
    note: z.string().optional(),
    startNow: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.plan === "WEEKLY") {
      if (data.scheduledDeliveryDate == null && data.preferredDayOfWeek == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Chagua siku ya kupokea mzigo wiki hii (Jumatano au Jumamosi)",
          path: ["scheduledDeliveryDate"],
        });
      }
    }
    if (data.plan === "MONTHLY" && data.preferredDayOfWeek == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Chagua siku ya utoaji kila wiki (Jumatano au Jumamosi)",
        path: ["preferredDayOfWeek"],
      });
    }
  });

export const membershipPreviewSchema = z.object({
  plan: z.enum(["WEEKLY", "MONTHLY"]),
  defaultBasket: defaultBasketSchema,
  packageId: z.string().min(1).optional(),
});

export const enrollRestaurantMembershipSchema = z.object({
  userId: z.string().min(1),
  mealSlots: z
    .array(mealSlotSchema)
    .min(1, "Chagua angalau muda mmoja (asubuhi, mchana, au usiku)")
    .max(3)
    .refine((slots) => new Set(slots).size === slots.length, "Usirudie muda uleule"),
  address: z.string().min(3).optional(),
  channel: channelSchema.default("WEB"),
});

export const pauseRestaurantMembershipSchema = z.object({
  weeks: z.coerce.number().int().min(1).max(8).default(1),
});

export const menuItemSchema = z.object({
  menuId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  unit: unitCodeSchema.default("PIECE"),
  categoryId: z.string().optional(),
  imageUrl: catalogImageUrlSchema.optional().or(z.literal("")),
  mealSlots: z.array(mealSlotSchema).min(1),
  available: z.boolean().default(true),
});

export const updateGroceryProductSchema = groceryProductSchema.partial().refine(
  (d) => Object.keys(d).length > 0,
  "Badilisha angalau uwanja mmoja"
);

export const updateMenuItemSchema = menuItemSchema
  .omit({ menuId: true })
  .partial()
  .extend({
    categoryId: z.string().min(1).nullable().optional(),
    description: z.string().nullable().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, "Badilisha angalau uwanja mmoja");

export const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
});

export const menuSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  active: z.boolean().default(true),
});

export const updateMenuSchema = menuSchema.partial().refine((d) => Object.keys(d).length > 0, "Badilisha angalau uwanja mmoja");

export const updateGroceryPackageSchema = groceryPackageSchema
  .partial()
  .refine((d) => Object.keys(d).length > 0, "Badilisha angalau uwanja mmoja");

export const updateSubscriptionSchema = z.object({
  status: z.enum(["PENDING_PAYMENT", "ACTIVE", "PAUSED", "CANCELLED"]).optional(),
  nextRunAt: z.string().datetime().nullable().optional(),
  address: z.string().min(3).optional(),
  note: z.string().nullable().optional(),
  preferredDayOfWeek: z.coerce.number().int().min(0).max(6).nullable().optional(),
  preferredDayOfMonth: z.coerce.number().int().min(1).max(28).nullable().optional(),
  secondaryDayOfMonth: z.coerce.number().int().min(1).max(28).nullable().optional(),
  packageId: z.string().optional(),
});

export const pauseSubscriptionSchema = z.object({
  /** Sitisha kwa wiki ngapi (mf. 1 = wiki moja) */
  weeks: z.coerce.number().int().min(1).max(12).optional(),
  /** Au hadi tarehe maalum */
  until: z.string().datetime().optional(),
});

export const updateSubscriptionBasketSchema = z.object({
  items: z
    .array(z.object({ productId: z.string(), quantity: z.number().positive() }))
    .min(1, "Kikapu lazima kiwe na bidhaa angalau moja"),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(["CUSTOMER", "ADMIN", "RIDER"]),
});

/** Admin: create a customer/staff account */
export const adminCreateUserSchema = z.object({
  phone: phoneSchema,
  name: z.string().min(2, "Jina lazima iwe angalau herufi 2"),
  email: z.union([z.string().email("Barua pepe si sahihi"), z.literal("")]).optional(),
  role: z.enum(["CUSTOMER", "ADMIN", "RIDER"]).optional().default("CUSTOMER"),
  locale: z.enum(["en", "sw"]).optional().default("en"),
  password: z.string().min(6, "Password lazima iwe angalau herufi 6").optional(),
});

/** Admin: update profile, role, locale, optional password reset */
export const adminUpdateUserSchema = z.object({
  name: z.string().min(2, "Jina lazima iwe angalau herufi 2").optional(),
  email: z.union([z.string().email("Barua pepe si sahihi"), z.literal(""), z.null()]).optional(),
  role: z.enum(["CUSTOMER", "ADMIN", "RIDER"]).optional(),
  locale: z.enum(["en", "sw"]).optional(),
  password: z.string().min(6, "Password lazima iwe angalau herufi 6").optional(),
});

export const updateLocaleSchema = z.object({
  userId: z.string().min(1),
  locale: z.enum(["en", "sw"]),
});

/** Customer: update own profile (name, optional email) */
export const updateProfileSchema = z.object({
  name: z.string().min(2, "Jina lazima iwe angalau herufi 2").optional(),
  email: z.union([z.string().email("Barua pepe si sahihi"), z.literal("")]).optional(),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

/** ISO date YYYY-MM-DD for grocery delivery day */
export const deliveryDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "deliveryDate lazima iwe YYYY-MM-DD");

export const generateMarketRunSchema = z.object({
  deliveryDate: deliveryDateSchema,
  lock: z.boolean().optional().default(false),
});

export const updateMarketSettingsSchema = z.object({
  autoGenerateEnabled: z.boolean().optional(),
  cutoffWeekday: z.coerce.number().int().min(0).max(6).optional(),
  cutoffHour: z.coerce.number().int().min(0).max(23).optional(),
});

export const deliveryZoneSchema = z.object({
  name: z.string().min(2),
  nameSw: z.string().min(2).optional(),
  keywords: z.array(z.string().min(2)).min(1),
  deliveryFee: z.coerce.number().min(0).optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

export const deliveryPricingModeSchema = z.enum(["FLAT_RATE", "MIN_ORDER_FREE", "ZONE"]);

export const deliveryPricingConfigSchema = z.object({
  mode: deliveryPricingModeSchema,
  flatRateFee: z.coerce.number().min(0),
  minOrderForFreeDelivery: z.coerce.number().min(0),
  unmatchedZoneFee: z.coerce.number().min(0),
});

export const updateDeliveryPricingConfigSchema = deliveryPricingConfigSchema.partial();

export const deliveryQuoteSchema = z.object({
  module: businessModuleSchema,
  address: z.string().optional(),
  items: z.array(cartItemSchema).min(1),
  forceFreeDelivery: z.boolean().optional(),
});

export const updateDeliveryZoneSchema = deliveryZoneSchema.partial();

export const packingLineSchema = z.object({
  key: z.string().min(1),
  productId: z.string().nullable(),
  name: z.string().min(1),
  unit: z.string().min(1),
  quantity: z.coerce.number().positive(),
  checked: z.boolean(),
});

export const updatePackingCheckSchema = z.object({
  lines: z.array(packingLineSchema).min(1),
});

export const assignOrderZoneSchema = z.object({
  deliveryZoneId: z.string().nullable(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type RegisterWebInput = z.infer<typeof registerWebSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateOrderSchemaInput = z.infer<typeof createOrderSchema>;
export type BusinessModule = z.infer<typeof businessModuleSchema>;
export type MealSlot = z.infer<typeof mealSlotSchema>;
