/** Convert Prisma/API values to JSON-safe primitives (Decimal → number, Date → ISO). */
export function serialize<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString() as T;
  if (typeof value === "object" && value !== null && "toNumber" in value && typeof (value as { toNumber: () => number }).toNumber === "function") {
    return (value as { toNumber: () => number }).toNumber() as T;
  }
  if (typeof value === "object" && value !== null && "toString" in value && Object.getPrototypeOf(value)?.constructor?.name === "Decimal") {
    return Number(String(value)) as T;
  }
  if (Array.isArray(value)) return value.map((v) => serialize(v)) as T;
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = serialize(v);
    }
    return out as T;
  }
  return value;
}
