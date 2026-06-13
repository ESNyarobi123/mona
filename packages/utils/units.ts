import type { AppLocale } from "@monana/i18n";

/** Built-in fallback units when DB list is unavailable */
export const SALE_UNITS = ["PIECE", "KG", "GRAM", "LITRE", "PORTION", "PACK"] as const;
export type SaleUnit = (typeof SALE_UNITS)[number] | string;

export type UnitDefinitionLike = {
  code: string;
  labelEn: string;
  labelSw: string;
  priceSuffix: string;
  quantitySuffixEn?: string | null;
  quantitySuffixSw?: string | null;
};

export const UNIT_LABELS: Record<string, { sw: string; en: string }> = {
  PIECE: { sw: "Kipande / Sahani", en: "Piece" },
  KG: { sw: "Kilo (kg)", en: "Kilogram" },
  GRAM: { sw: "Gramu (g)", en: "Gram" },
  LITRE: { sw: "Lita", en: "Litre" },
  PORTION: { sw: "Sehemu", en: "Portion" },
  PACK: { sw: "Pakiti", en: "Pack" },
};

export function unitMapFromDefinitions(units: UnitDefinitionLike[]) {
  const map = new Map<string, UnitDefinitionLike>();
  for (const unit of units) map.set(unit.code, unit);
  return map;
}

export function unitLabel(
  unit: SaleUnit | string,
  lang: AppLocale = "en",
  definitions?: UnitDefinitionLike[] | Map<string, UnitDefinitionLike>
) {
  const map = definitions instanceof Map ? definitions : unitMapFromDefinitions(definitions ?? []);
  const fromDb = map.get(unit);
  if (fromDb) return lang === "sw" ? fromDb.labelSw : fromDb.labelEn;
  const u = UNIT_LABELS[unit];
  return u ? u[lang] : unit;
}

function quantitySuffixFor(
  unit: string,
  lang: AppLocale,
  map: Map<string, UnitDefinitionLike>,
  n: number
) {
  const fromDb = map.get(unit);
  if (fromDb) {
    const suffix = lang === "sw" ? fromDb.quantitySuffixSw : fromDb.quantitySuffixEn;
    if (suffix) return suffix;
    return fromDb.priceSuffix;
  }
  return null;
}

/** e.g. 2 + KG → "2 kg", 1 + PIECE → "1 piece" */
export function formatQuantity(
  qty: number | string,
  unit: SaleUnit | string,
  lang: AppLocale = "en",
  definitions?: UnitDefinitionLike[] | Map<string, UnitDefinitionLike>
): string {
  const n = typeof qty === "string" ? Number(qty) : qty;
  const q = Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, "");
  const map = definitions instanceof Map ? definitions : unitMapFromDefinitions(definitions ?? []);
  const custom = quantitySuffixFor(unit, lang, map, n);
  if (custom) return `${q} ${custom}`;

  switch (unit) {
    case "KG":
      return `${q} kg`;
    case "GRAM":
      return `${q} g`;
    case "LITRE":
      return `${q} L`;
    case "PIECE":
      return lang === "sw"
        ? `${q} ${n === 1 ? "kipande" : "vipande"}`
        : `${q} ${n === 1 ? "piece" : "pieces"}`;
    case "PORTION":
      return `${q} ${lang === "sw" ? "sehemu" : n === 1 ? "portion" : "portions"}`;
    case "PACK":
      return `${q} ${lang === "sw" ? "pakiti" : n === 1 ? "pack" : "packs"}`;
    default:
      return `${q} ${unitLabel(unit, lang, map)}`;
  }
}

function tzs(amount: number) {
  return `TZS ${Math.round(amount).toLocaleString("en-US")}`;
}

/** Price display: TZS 3,000 / kg */
export function formatPricePerUnit(
  price: number,
  unit: SaleUnit | string,
  lang: AppLocale = "en",
  definitions?: UnitDefinitionLike[] | Map<string, UnitDefinitionLike>
): string {
  const priceStr = tzs(price);
  const map = definitions instanceof Map ? definitions : unitMapFromDefinitions(definitions ?? []);
  const fromDb = map.get(unit);
  if (fromDb) return `${priceStr} / ${fromDb.priceSuffix}`;

  switch (unit) {
    case "KG":
      return `${priceStr} / kg`;
    case "GRAM":
      return `${priceStr} / g`;
    case "LITRE":
      return `${priceStr} / L`;
    case "PIECE":
      return `${priceStr} / ${lang === "sw" ? "kipande" : "piece"}`;
    case "PORTION":
      return `${priceStr} / ${lang === "sw" ? "sehemu" : "portion"}`;
    case "PACK":
      return `${priceStr} / ${lang === "sw" ? "pakiti" : "pack"}`;
    default:
      return `${priceStr} / ${unitLabel(unit, lang, map)}`;
  }
}

export function localeDateString(date: Date | string, lang: AppLocale = "en") {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(lang === "sw" ? "sw-TZ" : "en-GB");
}

export function localeDateTimeString(date: Date | string, lang: AppLocale = "en") {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString(lang === "sw" ? "sw-TZ" : "en-GB");
}

/** Build simple label map for customer pages (Swahili-first legacy) */
export function unitLabelsRecord(
  units: UnitDefinitionLike[],
  lang: AppLocale = "sw"
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const unit of units) {
    out[unit.code] = lang === "sw" ? unit.labelSw : unit.labelEn;
  }
  for (const [code, labels] of Object.entries(UNIT_LABELS)) {
    if (!out[code]) out[code] = labels[lang];
  }
  return out;
}
