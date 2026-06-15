/** Route global admin search to the best page, keeping the query string. */
export function resolveAdminSearchRoute(raw: string): { path: string; q: string } {
  const q = raw.trim();
  const lower = q.toLowerCase();

  if (!q) return { path: "/admin/orders", q: "" };

  if (/(menyu|menu|chakula)/.test(lower)) return { path: "/admin/restaurant/menu", q };
  if (/(kategoria|categor)/.test(lower)) return { path: "/admin/restaurant/categories", q };
  if (/(jikoni|kitchen)/.test(lower)) return { path: "/admin/restaurant/kitchen", q };
  if (/(malipo|payment|lipa|reference)/.test(lower)) return { path: "/admin/payments", q };
  if (/(watumiaji|user|customer|mteja)/.test(lower)) return { path: "/admin/users", q };
  if (/^\+?\d[\d\s-]{7,}$/.test(q.replace(/\s/g, ""))) return { path: "/admin/users", q };
  if (/(whatsapp|bot)/.test(lower)) return { path: "/admin/whatsapp", q };
  if (/(landing|homepage|home page|ticker|mwanzo)/.test(lower)) return { path: "/admin/landing", q };
  if (/(grocery|soko|bidhaa)/.test(lower)) return { path: "/admin/grocery", q };
  if (/restaurant/.test(lower)) return { path: "/admin/restaurant", q };

  return { path: "/admin/orders", q };
}

/** Client-side match for menu items, categories, kitchen queue rows. */
export function matchesAdminSearch(
  q: string,
  parts: Array<string | null | undefined>
): boolean {
  const term = q.trim().toLowerCase();
  if (!term) return true;
  const haystack = parts.filter(Boolean).join(" ").toLowerCase();
  return haystack.includes(term);
}
