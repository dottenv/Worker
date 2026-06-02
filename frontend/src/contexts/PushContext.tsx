import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
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

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setSupported(false);
      return;
    }
    setSupported(true);
    setPermission(Notification.permission);

    navigator.serviceWorker.ready.then((reg) => {
      setSwReg(reg);
      reg.pushManager.getSubscription().then((sub) => {
        setSubscribed(!!sub);
        // auto-subscribe if permission already granted but no subscription yet
        if (!sub && Notification.permission === "granted") {
          subscribeWithReg(reg);
        }
      });
    }).catch(() => {});
  }, []);

  const subscribeWithReg = async (reg: ServiceWorkerRegistration) => {
    try {
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          "BJa0lzFHF6prlOzaAhhSjii6iGMSsifobXyI2qMZ0NVqN_ykPxYpUeRsvB9B6N4tTYbC5ZogSRsaN3SCS0Ks0BQ"
        ),
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
    } catch (e) {
      console.warn("Auto push subscribe failed:", e);
    }
  };

  const subscribe = async () => {
    if (!swReg) return;
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return;

      await subscribeWithReg(swReg);
    } catch (e) {
      console.warn("Push subscribe failed:", e);
    }
  };

  const unsubscribe = async () => {
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
  };

  return (
    <PushContext.Provider value={{ subscribed, supported, permission, subscribe, unsubscribe }}>
      {children}
    </PushContext.Provider>
  );
}

export function usePush() {
  return useContext(PushContext);
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output;
}
