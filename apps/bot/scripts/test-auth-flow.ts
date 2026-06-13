/**
 * Simulates WhatsApp auth — Option A (phone = identity).
 * Run: npx tsx scripts/test-auth-flow.ts
 */
import { handleMessage } from "../src/handlers/order.handler";

const PHONE = "2557123889900";

async function reply(text: string) {
  console.log(`\n🤖 BOT:\n${text}\n`);
}

async function send(userText: string) {
  console.log(`\n👤 USER: ${userText}`);
  await handleMessage(
    { from: `${PHONE}@s.whatsapp.net`, phone: PHONE, text: userText },
    reply
  );
}

async function main() {
  console.log("=== NEW USER: Hi → jina ===\n");
  await send("Hi");
  await send("Eric Kimaro");

  console.log("\n=== RETURNING USER: Hi again (must NOT ask register/login) ===\n");
  await send("Hi");

  console.log("\n=== Hi third time ===\n");
  await send("Hi");

  console.log("\n✅ Done — second Hi should say 'Karibu tena Eric' only.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
