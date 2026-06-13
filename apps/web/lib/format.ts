export function formatMoney(amount: number | string) {
  const n = typeof amount === "string" ? Number(amount) : amount;
  return `TZS ${Math.round(n).toLocaleString("en-US")}`;
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleString("sw-TZ", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const SLOT_LABELS: Record<string, string> = {
  BREAKFAST: "Asubuhi",
  LUNCH: "Mchana",
  DINNER: "Usiku",
};

export const UNIT_LABELS: Record<string, string> = {
  PIECE: "kipande",
  KG: "kilo",
  GRAM: "gramu",
  LITRE: "lita",
  PORTION: "sehemu",
  PACK: "pakiti",
};

export const PACKAGE_KIND_LABELS: Record<string, string> = {
  WEEKLY_BASKET: "Kifurushi cha Wiki",
  MONTHLY_PANTRY: "Kifurushi cha Mwezi",
};

export function toNumber(value: string | number) {
  return typeof value === "string" ? Number(value) : value;
}

export const KITCHEN_LABELS: Record<string, string> = {
  WAITING: "Inasubiri",
  COOKING: "Inapikwa",
  READY: "Tayari",
  SERVED: "Imetolewa",
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Inasubiri",
  CONFIRMED: "Imethibitishwa",
  PREPARING: "Inatayarishwa",
  ON_THE_WAY: "Njiani",
  DELIVERED: "Imewasilishwa",
  CANCELLED: "Imefutwa",
};
