/**
 * Web push helpers for the client. Mirrors the watchlist token mechanism so
 * a device's push subscription is attached to the same anonymous identity as
 * its watchlist (the server uses that token to scope alerts later).
 *
 * Everything here degrades gracefully: browsers without push support (or
 * non-secure contexts) simply report "not supported" and the UI hides itself.
 */

const TOKEN_KEY = "defiAlphaWatchlistToken";

export interface PushConfig {
  enabled: boolean;
  vapidPublicKey: string | null;
}

export function getClientToken(): string {
  try {
    let token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      token = `da-${crypto.randomUUID()}`;
      localStorage.setItem(TOKEN_KEY, token);
    }
    return token;
  } catch {
    return "";
  }
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export async function fetchPushConfig(): Promise<PushConfig> {
  try {
    const res = await fetch("/api/push/config");
    if (!res.ok) return { enabled: false, vapidPublicKey: null };
    return (await res.json()) as PushConfig;
  } catch {
    return { enabled: false, vapidPublicKey: null };
  }
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

/** The browser's current PushSubscription, or null. */
export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  try {
    const reg = await registerServiceWorker();
    if (!reg) return null;
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

/** Ask for permission + subscribe, then persist the subscription server-side. */
export async function subscribeToPush(config: PushConfig): Promise<{ ok: boolean; error?: string }> {
  if (!isPushSupported() || !config.vapidPublicKey) {
    return { ok: false, error: "not-supported" };
  }
  try {
    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }
    if (permission !== "granted") {
      return { ok: false, error: "permission-denied" };
    }

    const reg = await registerServiceWorker();
    if (!reg) {
      return { ok: false, error: "no-service-worker" };
    }

    const subscription =
      (await reg.pushManager.getSubscription()) ||
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(config.vapidPublicKey),
      }));

    const token = getClientToken();
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        keys: subscription.toJSON().keys,
        token,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: body.error || "server-error" };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "subscribe-failed" };
  }
}

/** Unsubscribe in the browser AND remove the server-side row. */
export async function unsubscribeFromPush(): Promise<{ ok: boolean }> {
  try {
    const subscription = await getPushSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      }).catch(() => {});
    }
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

/** Send a test notification to this device's subscription. */
export async function sendTestPush(): Promise<{ ok: boolean; message: string }> {
  try {
    const subscription = await getPushSubscription();
    const token = getClientToken();
    if (!subscription) return { ok: false, message: "Not subscribed on this device" };
    const res = await fetch("/api/push/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: subscription.endpoint, token }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.success) {
      return { ok: false, message: body.error || "Send failed" };
    }
    return { ok: true, message: "Test notification sent" };
  } catch {
    return { ok: false, message: "Send failed" };
  }
}
