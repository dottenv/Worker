import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { api } from '../api/client';
import { useAuth } from './AuthContext';
import { useSocketEvent } from './SocketContext';
import { playNotificationSound } from '../utils/sound';

interface Notification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

interface ToastItem {
  id: number;
  title: string;
  body: string | null;
  link: string | null;
  type: string;
}

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  toasts: ToastItem[];
  dismissToast: (id: number) => void;
  markRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
  deleteRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue>(null!);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastIdRef = useRef(0);

  const fetch = useCallback(async () => {
    if (!token) { setNotifications([]); setUnreadCount(0); return; }
    setLoading(true);
    try {
      const res = await api.get('/notifications');
      setNotifications(res.notifications);
      setUnreadCount(res.unread);
    } catch {}
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => {
    if (token) fetch();
    else { setNotifications([]); setUnreadCount(0); }
  }, [token, fetch]);

  useEffect(() => {
    if (navigator.setAppBadge && unreadCount > 0) {
      navigator.setAppBadge(unreadCount).catch(() => {});
    } else if (navigator.clearAppBadge) {
      navigator.clearAppBadge().catch(() => {});
    }
  }, [unreadCount]);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((n: Notification, soundEnabled?: boolean) => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, title: n.title, body: n.body, link: n.link, type: n.type }]);
    if (soundEnabled !== false) playNotificationSound();
    setTimeout(() => dismissToast(id), 5000);
  }, [dismissToast]);

  const { user } = useAuth();

  useSocketEvent('notification:new', (n: Notification) => {
    setNotifications(prev => [n, ...prev]);
    setUnreadCount(c => c + 1);
    addToast(n, user?.push_sound ?? true);
  });

  const markRead = useCallback(async (id: number) => {
    await api.put(`/notifications/${id}/read`);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(c => Math.max(0, c - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    await api.put('/notifications/read-all');
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const deleteRead = useCallback(async () => {
    await api.del('/notifications');
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  return (
    <NotificationContext value={{ notifications, unreadCount, loading, toasts, dismissToast, markRead, markAllRead, deleteRead, refresh: fetch }}>
      {children}
    </NotificationContext>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
