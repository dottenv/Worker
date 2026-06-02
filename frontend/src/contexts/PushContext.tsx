import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { api } from "../api/client";

interface PushContextType {
  subscribed: boolean;
  supported: boolean;
  permission: NotificationPermission | "unsupported";
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

const PushContext = createContext<PushContextType>({
  subscribed: false,
  supported: false,
  permission: "unsupported",
  subscribe: async () => {},
  unsubscribe: async () => {},
});

export function PushProvider({ children }: { children: ReactNode }) {
  const [subscribed, setSubscribed] = useState(false);
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const [swReg, setSwReg] = useState<ServiceWorkerRegistration | null>(null);
  const [vapidKey, setVapidKey] = useState<string | null>(null);

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setSupported(false);
      return;
    }
    setSupported(true);
    setPermission(Notification.permission);

    // fetch VAPID public key from server
    api.get("/vapid/public-key").then((data) => {
      if (data.publicKey) setVapidKey(data.publicKey);
    }).catch(() => {});

    navigator.serviceWorker.ready.then((reg) => {
      setSwReg(reg);
      reg.pushManager.getSubscription().then((sub) => {
        setSubscribed(!!sub);
      });
    }).catch(() => {});
  }, []);

  const subscribeWithReg = useCallback(async (reg: ServiceWorkerRegistration, key: string) => {
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    });

    const toBase64Url = (buf: ArrayBuffer) =>
      btoa(String.fromCharCode(...new Uint8Array(buf)))
        .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

    await api.push.subscribe({
      endpoint: sub.endpoint,
      keys: {
        p256dh: toBase64Url(sub.getKey("p256dh")!),
        auth: toBase64Url(sub.getKey("auth")!),
      },
    });
    setSubscribed(true);
  }, []);

  const subscribe = useCallback(async () => {
    if (!swReg) return;
    if (!vapidKey) {
      try {
        const data = await api.get("/vapid/public-key");
        if (!data.publicKey) throw new Error("No VAPID key");
        setVapidKey(data.publicKey);
      } catch {
        console.warn("Failed to fetch VAPID key");
        return;
      }
    }

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return;

      await subscribeWithReg(swReg, vapidKey!);
    } catch (e) {
      console.warn("Push subscribe failed:", e);
    }
  }, [swReg, vapidKey, subscribeWithReg]);

  const unsubscribe = useCallback(async () => {
    if (!swReg) return;
    try {
      const sub = await swReg.pushManager.getSubscription();
      if (sub) {
        await api.push.unsubscribe(sub.endpoint);
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch (e) {
      console.warn("Push unsubscribe failed:", e);
    }
  }, [swReg]);

  return (
    <PushContext.Provider value={{ subscribed, supported, permission, subscribe, unsubscribe }}>
      {children}
    </PushContext.Provider>
  );
}

export function usePush() {
  return useContext(PushContext);
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output;
}
