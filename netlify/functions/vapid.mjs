import {
  json,
  setup,
} from "./_push-lib.mjs";

export default async function handler(request) {
  if (request.method !== "GET") {
    return json(
      {
        error: "Metodo non consentito",
      },
      405
    );
  }

  try {
    const publicKey = setup();

    return json({
      publicKey,
    });
  } catch (error) {
    console.error("Errore configurazione VAPID:", error);

    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      500
    );
  }
}

export const config = {
  path: "/api/vapid",
};
