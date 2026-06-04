import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { api } from "../api/client";

interface PushContextType {
  subscribed: boolean;
  supported: boolean;
  permission: NotificationPermission | "unsupported";
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
  error: string;
}

const PushContext = createContext<PushContextType>({
  subscribed: false,
  supported: false,
  permission: "unsupported",
  subscribe: async () => {},
  unsubscribe: async () => {},
  error: "",
});

async function getSwRegistration(): Promise<ServiceWorkerRegistration | null> {
  try {
    const reg = await navigator.serviceWorker.ready;
    return reg;
  } catch {
    // ready() failed — try manual registration
  }
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    return reg;
  } catch {
    return null;
  }
}

export function PushProvider({ children }: { children: ReactNode }) {
  const [subscribed, setSubscribed] = useState(false);
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const [swReg, setSwReg] = useState<ServiceWorkerRegistration | null>(null);
  const [vapidKey, setVapidKey] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setSupported(false);
      return;
    }
    setSupported(true);
    setPermission(Notification.permission);

    api.get("/vapid/public-key").then((data) => {
      if (data.publicKey) setVapidKey(data.publicKey);
    }).catch(() => {});

    getSwRegistration().then((reg) => {
      if (!reg) return;
      setSwReg(reg);
      reg.pushManager.getSubscription().then((sub) => {
        setSubscribed(!!sub);
      });
    });
  }, []);

  const subscribeWithReg = useCallback(async (reg: ServiceWorkerRegistration, key: string) => {
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key) as any,
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
    setError("");
  }, []);

  const ensureReg = useCallback(async (): Promise<ServiceWorkerRegistration | null> => {
    if (swReg) return swReg;
    const reg = await getSwRegistration();
    if (reg) setSwReg(reg);
    return reg;
  }, [swReg]);

  const subscribe = useCallback(async () => {
    setError("");

    const reg = await ensureReg();
    if (!reg) {
      setError("Service Worker не зарегистрирован");
      return;
    }

    let key = vapidKey;
    if (!key) {
      try {
        const data = await api.get("/vapid/public-key");
        if (!data.publicKey) throw new Error("No VAPID key");
        key = data.publicKey;
        setVapidKey(key);
      } catch {
        setError("Не удалось получить VAPID ключ");
        return;
      }
    }

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        setError("Разрешение на уведомления не получено");
        return;
      }
      await subscribeWithReg(reg, key!);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Ошибка подписки";
      setError(msg);
    }
  }, [ensureReg, vapidKey, subscribeWithReg]);

  const unsubscribe = useCallback(async () => {
    setError("");

    const reg = await ensureReg();
    if (!reg) {
      setSubscribed(false);
      return;
    }

    try {
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await api.push.unsubscribe(sub.endpoint);
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Ошибка отписки";
      setError(msg);
    }
  }, [ensureReg]);

  return (
    <PushContext.Provider value={{ subscribed, supported, permission, subscribe, unsubscribe, error }}>
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
