import {
  json,
  load,
  save,
  setup,
  store,
  key,
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

export default async function handler(request) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        allow: "GET, POST, DELETE, OPTIONS",
        "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
        "access-control-allow-headers": "content-type",
      },
    });
  }

  try {
    /*
     * GET /api/push-subscribe
     *
     * Restituisce la chiave pubblica VAPID al browser.
     */
    if (request.method === "GET") {
      const publicKey = setup();

      return json({
        ok: true,
        publicKey,
      });
    }

    /*
     * POST /api/push-subscribe
     *
     * Registra o aggiorna la sottoscrizione Push del dispositivo.
     */
    if (request.method === "POST") {
      setup();

      const payload = await request.json();
      const deviceId = payload?.deviceId?.trim();
      const subscription = payload?.subscription;

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

      const existing = await load(deviceId);

      const device = {
        deviceId,
        subscription,
        reminders: Array.isArray(existing?.reminders)
          ? existing.reminders
          : [],
        createdAt:
          existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userAgent: request.headers.get("user-agent") || "",
      };

      await save(deviceId, device);

      return json({
        ok: true,
        subscribed: true,
        deviceId,
      });
    }

    /*
     * DELETE /api/push-subscribe
     *
     * Elimina la sottoscrizione e i promemoria del dispositivo.
     */
    if (request.method === "DELETE") {
      const payload = await request.json();
      const deviceId = payload?.deviceId?.trim();

      if (!isValidDeviceId(deviceId)) {
        return json(
          {
            ok: false,
            error: "Identificativo dispositivo non valido",
          },
          400
        );
      }

      await store().delete(key(deviceId));

      return json({
        ok: true,
        removed: true,
      });
    }

    return json(
      {
        ok: false,
        error: "Metodo non consentito",
      },
      405
    );
  } catch (error) {
    console.error("Errore sottoscrizione Push:", error);

    return json(
      {
        ok: false,
        error: "Impossibile configurare le notifiche Push",
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
  path: "/api/push-subscribe",
};
