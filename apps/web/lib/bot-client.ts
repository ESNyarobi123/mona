const BOT_URL = process.env.BOT_URL ?? "http://localhost:4000";

export type BotStatus = {
  state: string;
  connected: boolean;
  needsQr: boolean;
  qr: string | null;
  phone: string | null;
  jid: string | null;
};

export async function fetchBotHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BOT_URL}/health`, { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchBotStatus(): Promise<BotStatus | null> {
  try {
    const res = await fetch(`${BOT_URL}/status`, { cache: "no-store" });
    const json = await res.json();
    if (!json.success) return null;
    return json.data as BotStatus;
  } catch {
    return null;
  }
}

export async function fetchBotQr(): Promise<{ qr: string | null; dataUrl: string | null; message?: string } | null> {
  try {
    const res = await fetch(`${BOT_URL}/qr`, { cache: "no-store" });
    const json = await res.json();
    if (!json.success) return null;
    return json.data;
  } catch {
    return null;
  }
}
