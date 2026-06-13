import { startWhatsApp } from "./connection/whatsapp";
import { startHttpServer } from "./server";
import { handleMessage } from "./handlers/order.handler";

// Entry point for the Monana WhatsApp bot.
async function main() {
  console.log("[bot] starting Monana WhatsApp bot...");
  startHttpServer();
  await startWhatsApp(handleMessage);
}

main().catch((err) => {
  console.error("[bot] fatal error:", err);
  process.exit(1);
});
