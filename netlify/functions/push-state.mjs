import {
  json,
  save,
  setup,
} from "./_push-lib.mjs";

function isValidSubscription(subscription) {
  return Boolean(
    subscription &&
      typeof subscription.endpoint === "string" &&
      subscription.endpoint.startsWith("https://") &&
      subscription.keys &&
      typeof subscription.keys.p256dh === "string" &&
      typeof subscription.keys.auth === "string"
  );
}

function isValidDeviceId(deviceId) {
  return (
    typeof deviceId === "string" &&
    deviceId.trim().length >= 8 &&
    deviceId.trim().length <= 200
  );
}

function normalizeReminder(reminder) {
  if (!reminder || typeof reminder !== "object") {
    return null;
  }

  const cleaningAt = Date.parse(reminder.cleaningAt);
  const reminderAt = Date.parse(reminder.reminderAt);

  if (
    !reminder.id ||
    !Number.isFinite(cleaningAt) ||
    !Number.isFinite(reminderAt)
  ) {
    return null;
  }

  return {
    id: String(reminder.id),
    vehicle: String(reminder.vehicle || "Mezzo"),
    address: String(reminder.address || "Indirizzo non disponibile"),
    segment: String(reminder.segment || ""),
    cleaningAt: new Date(cleaningAt).toISOString(),
    reminderAt: new Date(reminderAt).toISOString(),
    sentAt: null,
  };
}

export default async function handler(request) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        allow: "POST, OPTIONS",
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers": "content-type",
      },
    });
  }

  if (request.method !== "POST") {
    return json(
      {
        ok: false,
        error: "Metodo non consentito",
      },
      405
    );
  }

  try {
    setup();

    const payload = await request.json();
    const deviceId = payload?.deviceId?.trim();
    const subscription = payload?.subscription;
    const suppliedReminders = Array.isArray(payload?.reminders)
      ? payload.reminders
      : [];

    if (!isValidDeviceId(deviceId)) {
      return json(
        {
          ok: false,
          error: "Identificativo dispositivo non valido",
        },
        400
      );
    }

    if (!isValidSubscription(subscription)) {
      return json(
        {
          ok: false,
          error: "Sottoscrizione Push non valida",
        },
        400
      );
    }

    const reminders = suppliedReminders
      .slice(0, 2)
      .map(normalizeReminder)
      .filter(Boolean);

    await save(deviceId, {
      deviceId,
      subscription,
      reminders,
      updatedAt: new Date().toISOString(),
    });

    return json({
      ok: true,
      remindersSaved: reminders.length,
    });
  } catch (error) {
    console.error("Errore salvataggio stato Push:", error);

    return json(
      {
        ok: false,
        error: "Impossibile salvare i promemoria",
        detail:
          error instanceof Error
            ? error.message
            : String(error),
      },
      500
    );
  }
}

export const config = {
  path: "/api/push-state",
};
