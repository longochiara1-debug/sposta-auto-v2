const DEVICE_KEY = "sposta-auto-v2-device-id";

function getDeviceId() {
  let deviceId = localStorage.getItem(DEVICE_KEY);

  if (!deviceId) {
    deviceId =
      crypto.randomUUID?.() ||
      `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    localStorage.setItem(DEVICE_KEY, deviceId);
  }

  return deviceId;
}

function urlBase64ToUint8Array(value) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);

  const base64 = (value + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = atob(base64);

  return Uint8Array.from(
    [...rawData].map((character) => character.charCodeAt(0))
  );
}

export function supported() {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function status() {
  if (!supported()) {
    return "unsupported";
  }

  if (Notification.permission === "denied") {
    return "denied";
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription =
    await registration.pushManager.getSubscription();

  return subscription
    ? "enabled"
    : Notification.permission;
}

export async function enable(spots = []) {
  if (!supported()) {
    throw new Error(
      "Le notifiche Push non sono supportate. Su iPhone installa e apri la PWA dalla schermata Home."
    );
  }

  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    throw new Error("Permesso notifiche non concesso.");
  }

  const registration = await navigator.serviceWorker.ready;

  const vapidResponse = await fetch("/api/vapid", {
    cache: "no-store",
  });

  if (!vapidResponse.ok) {
    throw new Error("Configurazione VAPID non disponibile.");
  }

  const payload = await vapidResponse.json();
  const publicKey = payload?.publicKey;

  if (!publicKey) {
    throw new Error("Chiave pubblica VAPID mancante.");
  }

  let subscription =
    await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey:
        urlBase64ToUint8Array(publicKey),
    });
  }

  await sync(spots, subscription);

  return subscription;
}

export async function sync(
  spots = [],
  suppliedSubscription = null
) {
  if (
    !supported() ||
    Notification.permission !== "granted"
  ) {
    return;
  }

  const registration = await navigator.serviceWorker.ready;

  const subscription =
    suppliedSubscription ||
    (await registration.pushManager.getSubscription());

  if (!subscription) {
    return;
  }

  const reminders = spots
    .filter(
      (spot) =>
        spot.reminderAt &&
        spot.cleaningAt
    )
    .slice(0, 2)
    .map((spot) => ({
      id: spot.id,
      vehicle: spot.vehicle,
      address: spot.address,
      segment: spot.rule?.segment || "",
      cleaningAt: spot.cleaningAt,
      reminderAt: spot.reminderAt,
    }));

  const response = await fetch("/api/push-state", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      deviceId: getDeviceId(),
      subscription: subscription.toJSON(),
      reminders,
    }),
  });

  if (!response.ok) {
    const payload = await response
      .json()
      .catch(() => ({}));

    throw new Error(
      payload.error ||
        "Salvataggio promemoria Push non riuscito."
    );
  }
}

export async function test() {
  const response = await fetch("/api/push-test", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      deviceId: getDeviceId(),
    }),
  });

  const payload = await response
    .json()
    .catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      payload.error ||
        "Notifica di prova non inviata."
    );
  }

  return payload;
}
