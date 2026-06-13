import fs from "node:fs/promises";
import path from "node:path";
import {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  type WASocket,
} from "baileys";
import { Boom } from "@hapi/boom";
import qrcode from "qrcode-terminal";
import type { WAMessage } from "baileys";
import { extractPhoneFromMessage } from "../utils/phone";
import { setBotState, setConnectedJid, setLatestQr } from "./bot-state";

export type IncomingMessage = {
  from: string;
  phone: string;
  text: string;
};

export type MessageHandler = (
  msg: IncomingMessage,
  reply: (text: string) => Promise<void>
) => Promise<void>;

const SESSION_PATH = path.resolve(process.env.BOT_SESSION_PATH ?? "./session");

let sock: WASocket | null = null;
let messageHandler: MessageHandler | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let connecting = false;

function disconnectCode(lastDisconnect: unknown): number | undefined {
  return (lastDisconnect as { error?: Boom })?.error?.output?.statusCode;
}

function shouldClearSession(code: number | undefined): boolean {
  return (
    code === DisconnectReason.loggedOut ||
    code === DisconnectReason.badSession ||
    code === DisconnectReason.multideviceMismatch ||
    code === DisconnectReason.forbidden
  );
}

function shouldReconnect(code: number | undefined): boolean {
  if (code === DisconnectReason.loggedOut) return true;
  if (code === DisconnectReason.connectionReplaced) return false;
  return true;
}

async function clearAuthSession(): Promise<void> {
  try {
    const files = await fs.readdir(SESSION_PATH);
    await Promise.all(
      files.map((file) => fs.unlink(path.join(SESSION_PATH, file)))
    );
    console.log("[bot] session imefutwa — tafadhali skani QR mpya");
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") throw err;
  }
}

function teardownSocket(): void {
  if (!sock) return;
  try {
    sock.ev.removeAllListeners("connection.update");
    sock.ev.removeAllListeners("messages.upsert");
    sock.ev.removeAllListeners("creds.update");
    sock.end(undefined);
  } catch {
    // ignore teardown errors
  }
  sock = null;
}

function scheduleReconnect(clearSession: boolean, delayMs = 1500): void {
  if (!messageHandler) return;
  if (reconnectTimer) clearTimeout(reconnectTimer);

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    void (async () => {
      if (clearSession) await clearAuthSession();
      await connectWhatsApp(messageHandler!);
    })();
  }, delayMs);
}

async function connectWhatsApp(onMessage: MessageHandler): Promise<WASocket> {
  if (connecting) return sock!;
  connecting = true;

  try {
    teardownSocket();
    setBotState("starting");
    setConnectedJid(null);
    setLatestQr(null);

    const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH);
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({ auth: state, version });
    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        setLatestQr(qr);
        qrcode.generate(qr, { small: true });
        console.log("[bot] Scan QR (pia admin dashboard /admin/whatsapp)");
      }

      if (connection === "close") {
        const code = disconnectCode(lastDisconnect);
        const clearSession = shouldClearSession(code);
        const reconnect = shouldReconnect(code);

        setConnectedJid(null);
        setLatestQr(null);
        setBotState(clearSession ? "logged_out" : "disconnected");

        console.log("[bot] connection closed.", {
          code,
          reconnect,
          clearSession,
        });

        if (reconnect) {
          scheduleReconnect(clearSession, clearSession ? 800 : 2000);
        }
      } else if (connection === "open") {
        setConnectedJid(sock?.user?.id ?? null);
        console.log("[bot] connected to WhatsApp ✅", sock?.user?.id);
      }
    });

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
      if (type !== "notify" || !sock) return;
      for (const m of messages) {
        if (!m.message || m.key.fromMe) continue;
        const from = m.key.remoteJid ?? "";
        if (from.endsWith("@g.us")) continue;
        const text =
          m.message.conversation ?? m.message.extendedTextMessage?.text ?? "";
        if (!text) continue;

        const phone = extractPhoneFromMessage(m as WAMessage);
        if (!phone) {
          console.warn("[bot] skipped message — could not resolve phone from", from);
          continue;
        }
        console.log(`[bot] msg from ${phone}: ${text.trim().slice(0, 40)}`);
        await onMessage({ from, phone, text: text.trim() }, async (reply) => {
          await sock!.sendMessage(from, { text: reply });
        });
      }
    });

    return sock;
  } finally {
    connecting = false;
  }
}

export function getSocket(): WASocket | null {
  return sock;
}

export function toJid(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.includes("@") ? phone : `${digits}@s.whatsapp.net`;
}

export async function sendText(phone: string, text: string): Promise<void> {
  if (!sock) throw new Error("WhatsApp socket haijawa tayari");
  const st = sock.user;
  if (!st) throw new Error("WhatsApp haijaunganishwa — skani QR kwanza");
  await sock.sendMessage(toJid(phone), { text });
}

/**
 * Send an image (e.g. payment QR) from a data URL. Caption is optional.
 * Throws if the socket is not connected so callers can fall back to text.
 */
export async function sendImageDataUrl(
  phone: string,
  dataUrl: string,
  caption?: string
): Promise<void> {
  if (!sock?.user) throw new Error("WhatsApp haijaunganishwa");
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64, "base64");
  await sock.sendMessage(toJid(phone), { image: buffer, caption });
}

export async function startWhatsApp(onMessage: MessageHandler): Promise<WASocket> {
  messageHandler = onMessage;
  return connectWhatsApp(onMessage);
}
