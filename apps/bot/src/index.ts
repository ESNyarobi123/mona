import { startWhatsApp } from "./connection/whatsapp";
import { startHttpServer } from "./server";
import { startCronJobs } from "./cron-jobs";
import { handleMessage } from "./handlers/order.handler";

// Entry point for the Monana WhatsApp bot.
async function main() {
  console.log("[bot] starting Monana WhatsApp bot...");
  startHttpServer();
  startCronJobs();
  await startWhatsApp(handleMessage);
}

main().catch((err) => {
  console.error("[bot] fatal error:", err);
  process.exit(1);
});
