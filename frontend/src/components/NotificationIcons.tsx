import { type ReactNode } from 'react';
import {
  BellRing, Building2, ArrowRightLeft, CheckCircle2,
  XCircle, Ban, Zap, CalendarSync,
} from 'lucide-react';

const iconMap: Record<string, { icon: ReactNode; color: string; bg: string }> = {
  welcome:        { icon: <BellRing size={18} />,       color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
  center_access:  { icon: <Building2 size={18} />,       color: '#06b6d4', bg: 'rgba(6,182,212,0.15)' },
  swap_created:   { icon: <ArrowRightLeft size={18} />,  color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  swap_accepted:  { icon: <CheckCircle2 size={18} />,    color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  swap_rejected:  { icon: <XCircle size={18} />,         color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  swap_cancelled: { icon: <Ban size={18} />,             color: '#6b7280', bg: 'rgba(107,114,128,0.15)' },
  swap_forced:    { icon: <Zap size={18} />,             color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
  schedule_update:{ icon: <CalendarSync size={18} />,    color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
};

const fallback = { icon: <BellRing size={18} />, color: '#6b7280', bg: 'rgba(107,114,128,0.15)' };

export function getNotificationIcon(type: string) {
  return iconMap[type] || fallback;
}

export function NotificationIcon({ type, size }: { type: string; size?: number }) {
  const { icon, color, bg } = getNotificationIcon(type);
  return (
    <div className="rounded-full flex items-center justify-center shrink-0"
      style={{ width: size || 32, height: size || 32, backgroundColor: bg, color }}>
      {icon}
    </div>
  );
}
