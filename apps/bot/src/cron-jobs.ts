/** Poll Monana web API for scheduled jobs (meal-slot reminders, etc.). */
export function startCronJobs() {
  const base = (process.env.API_BASE_URL ?? "http://localhost:3000/api").replace(/\/$/, "");
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    console.warn("[bot] CRON_SECRET not set — meal-slot reminders will not run automatically");
    return;
  }

  async function notifyMealSlots() {
    try {
      const res = await fetch(`${base}/restaurant/membership/notify-slots`, {
        method: "POST",
        headers: { "x-cron-secret": secret! },
      });
      const json = (await res.json().catch(() => ({}))) as {
        data?: { notified?: number; slots?: string[] };
      };
      if (!res.ok) {
        console.error("[bot] notify-slots failed:", res.status, json);
        return;
      }
      const n = json.data?.notified ?? 0;
      if (n > 0) {
        console.log(`[bot] meal-slot reminders sent: ${n} (${(json.data?.slots ?? []).join(", ")})`);
      }
    } catch (err) {
      console.error("[bot] notify-slots cron error:", err);
    }
  }

  void notifyMealSlots();
  setInterval(notifyMealSlots, 2 * 60 * 1000);
  console.log("[bot] meal-slot reminder cron started (every 2 min)");
}
