import { getStore } from "@netlify/blobs";
import { createHash } from "node:crypto";

const STORE_NAME = "sposta-auto-push";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function subscriptionId(endpoint) {
  return createHash("sha256")
    .update(endpoint)
    .digest("hex");
}

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

export default async function handler(request) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        allow: "POST, DELETE, OPTIONS",
        "access-control-allow-methods": "POST, DELETE, OPTIONS",
        "access-control-allow-headers": "content-type",
      },
    });
  }

  if (request.method !== "POST" && request.method !== "DELETE") {
    return json(
      { error: "Metodo non consentito" },
      405
    );
  }

  try {
    const payload = await request.json();
    const subscription = payload?.subscription;

    if (!subscription?.endpoint) {
      return json(
        { error: "Sottoscrizione Push mancante" },
        400
      );
    }

    const id = subscriptionId(subscription.endpoint);
    const store = getStore(STORE_NAME);

    if (request.method === "DELETE") {
      await store.delete(`subscriptions/${id}`);

      return json({
        ok: true,
        removed: true,
      });
    }

    if (!isValidSubscription(subscription)) {
      return json(
        { error: "Sottoscrizione Push non valida" },
        400
      );
    }

    const record = {
      id,
      subscription,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userAgent: request.headers.get("user-agent") || "",
    };

    await store.setJSON(`subscriptions/${id}`, record);

    return json({
      ok: true,
      subscriptionId: id,
    });
  } catch (error) {
    console.error("Errore registrazione Push:", error);

    return json(
      {
        error: "Impossibile registrare le notifiche",
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
