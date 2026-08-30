import {
  Home,
  Building2,
  Calendar,
  ArrowRightLeft,
  Clock,
  Wallet,
  Bell,
  Settings,
  FileText,
} from 'lucide-react';

export interface NavItemDef {
  id: string;
  label: string;
  icon: any;
  path: string;
  requiresOwner?: boolean;
  requiresFinance?: boolean;
  requiresAdmin?: boolean;
  hideForOwner?: boolean;
}

export const ALL_NAV_ITEMS: NavItemDef[] = [
  { id: 'dashboard',          label: 'Главная',             icon: Home,        path: '/' },
  { id: 'centers',           label: 'Склады',              icon: Building2,   path: '/centers',           requiresOwner: true },
  { id: 'schedule',          label: 'График',              icon: Calendar,    path: '/schedule' },
  { id: 'swaps',             label: 'Обмены',              icon: ArrowRightLeft, path: '/swaps' },
  { id: 'time_requests',     label: 'Запросы',             icon: Clock,       path: '/time-requests',     requiresOwner: true },
  { id: 'finance',           label: 'Финансы',             icon: Wallet,      path: '/finance',            requiresFinance: true, hideForOwner: true },
  { id: 'finance_admin',     label: 'Финансы (админ)',     icon: Wallet,      path: '/finance/admin',      requiresAdmin: true, requiresFinance: true },
  { id: 'shift_documents',   label: 'Документы смен',      icon: FileText,    path: '/shift-documents' },
  { id: 'notifications',     label: 'Уведомления',         icon: Bell,        path: '/notifications' },
  { id: 'settings',          label: 'Настройки',           icon: Settings,    path: '/settings' },
];

export const DEFAULT_PINNED = ['dashboard', 'schedule', 'settings'];

export function getAvailableItems(
  isOwner: boolean,
  isAdmin: boolean,
  financeAvailable: boolean,
): NavItemDef[] {
  return ALL_NAV_ITEMS.filter((item) => {
    if (item.requiresOwner && !isOwner) return false;
    if (item.requiresFinance && !financeAvailable) return false;
    if (item.requiresAdmin && !isOwner && !isAdmin) return false;
    if (item.hideForOwner && isOwner) return false;
    return true;
  });
}
