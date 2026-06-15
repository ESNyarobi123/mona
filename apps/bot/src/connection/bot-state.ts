import { jidToMsisdn } from "@monana/utils";

/** Shared bot connection state for HTTP /status and /qr endpoints */
export type BotConnectionState =
  | "starting"
  | "qr"
  | "connected"
  | "disconnected"
  | "logged_out";

let state: BotConnectionState = "starting";
let latestQr: string | null = null;
let connectedJid: string | null = null;

export function setBotState(next: BotConnectionState) {
  state = next;
}

export function setLatestQr(qr: string | null) {
  latestQr = qr;
  if (qr) state = "qr";
}

export function setConnectedJid(jid: string | null) {
  connectedJid = jid;
  if (jid) {
    state = "connected";
    latestQr = null;
  }
}

export function getBotState() {
  const phone = jidToMsisdn(connectedJid);
  return {
    state,
    connected: state === "connected",
    needsQr: state === "qr" && !!latestQr,
    qr: latestQr,
    phone,
    jid: connectedJid,
  };
}
