import { NextResponse } from "next/server";

// Webhook / bridge endpoint for the WhatsApp bot to push events to the core.
export async function POST(req: Request) {
  const body = await req.json();
  console.log("[whatsapp] event:", body);
  return NextResponse.json({ success: true });
}
