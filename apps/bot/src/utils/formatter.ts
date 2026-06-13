// WhatsApp text formatting helpers.
export function formatTZS(amount: number): string {
  return `TZS ${Math.round(amount).toLocaleString("en-US")}`;
}

export function bold(text: string): string {
  return `*${text}*`;
}

export function numberedList(items: string[]): string {
  return items.map((it, i) => `${i + 1}. ${it}`).join("\n");
}
