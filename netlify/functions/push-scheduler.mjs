import webpush from "web-push";
import { setup, store } from "./_push-lib.mjs";

export default async function handler() {
  setup();
  const s = store();
  const now = Date.now();
  let cursor;
  let sent = 0;

  do {
    const page = await s.list({ prefix: "device-", cursor });
    cursor = page.cursor;

    for (const blob of page.blobs) {
      const device = await s.get(blob.key, { type: "json" });
      if (!device?.subscription) continue;

      let changed = false;
      let deleted = false;

      for (const reminder of device.reminders || []) {
        const due = Date.parse(reminder.reminderAt);
        const cleaning = Date.parse(reminder.cleaningAt);
        if (reminder.sentAt || !Number.isFinite(due) || !Number.isFinite(cleaning) || due > now || cleaning <= now) continue;

        try {
          const time = new Date(cleaning).toLocaleTimeString("it-IT", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Europe/Rome",
          });
          await webpush.sendNotification(device.subscription, JSON.stringify({
            title: `Sposta ${String(reminder.vehicle || "il mezzo").toLowerCase()}`,
            body: `Domani ${reminder.address}${reminder.segment ? ` (${reminder.segment})` : ""}: pulizia dalle ${time}.`,
            tag: `reminder-${reminder.id}`,
            url: "/",
          }));
          reminder.sentAt = new Date().toISOString();
          changed = true;
          sent += 1;
        } catch (error) {
          if (error.statusCode === 404 || error.statusCode === 410) {
            await s.delete(blob.key);
            deleted = true;
            break;
          }
          console.error("Invio push fallito", blob.key, error);
        }
      }

      if (changed && !deleted) await s.setJSON(blob.key, device);
    }
  } while (cursor);

  return new Response(JSON.stringify({ ok: true, sent }), {
    headers: { "content-type": "application/json" },
  });
}

export const config = { schedule: "*/5 * * * *" };
