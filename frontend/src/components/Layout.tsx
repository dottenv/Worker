import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useHeader } from '../contexts/useHeader';
import { useNotifications } from '../contexts/NotificationContext';
import {
  ArrowLeft,
  Bell,
  User,
  Grid,
  X,
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { api } from '../api/client';
import { getAvailableItems, DEFAULT_PINNED } from '../config/navItems';
import InstallPrompt from './InstallPrompt';
import ToastNotifications from './ToastNotifications';

function NavLink({ to, label, icon: Icon, active, badge }: { to: string; label: string; icon: any; active: boolean; badge?: number }) {
  return (
    <Link
      to={to}
      className={`flex flex-col items-center gap-0.5 px-3 py-1.5 transition-all relative ${
        active ? 'text-indigo-600' : ''
      }`}
      style={{ color: active ? undefined : 'var(--text-secondary)' }}
    >
      <div className={`p-1.5 rounded-xl transition-colors relative ${active ? 'bg-indigo-50' : ''}`}>
        <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
        {badge && badge > 0 ? (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold min-w-[16px] h-4 flex items-center justify-center rounded-full px-1 leading-none shadow-sm">
            {badge > 99 ? '99+' : badge}
          </span>
        ) : null}
      </div>
      <span className="text-[10px] font-medium leading-none opacity-70">
        {label}
      </span>
    </Link>
  );
}

function BellButton() {
  const { unreadCount } = useNotifications();
  return (
    <Link to="/notifications" className="relative p-2 transition-colors" style={{ color: 'var(--text-secondary)' }}>
      <Bell size={20} />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold min-w-[16px] h-4 flex items-center justify-center rounded-full px-1 leading-none shadow-sm">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  );
}

export default function Layout() {
  const { user, isOwner } = useAuth();
  const { state } = useHeader();
  const location = useLocation();
  const [financeAvailable, setFinanceAvailable] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    api.get('/finance/status').then(res => {
      setFinanceAvailable(res.available);
    }).catch(() => {});
  }, []);

  const availableItems = useMemo(
    () => getAvailableItems(isOwner, financeAvailable),
    [isOwner, financeAvailable]
  );

  const pinnedIds = user?.nav_config?.pinned?.length
    ? user.nav_config.pinned.filter(id => availableItems.some(a => a.id === id))
    : DEFAULT_PINNED.filter(id => availableItems.some(a => a.id === id));

  const bottomItems = availableItems.filter(a => pinnedIds.includes(a.id)).slice(0, 5);
  const hasMore = availableItems.length > bottomItems.length;

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-dvh flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <header
        className="sticky top-0 z-10"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
      >
          <div className="max-w-lg mx-auto px-5 h-14 flex items-center justify-between">
            {state.backTo ? (
              <Link
                to={state.backTo}
                className="flex items-center gap-2 text-sm font-medium transition-colors"
                style={{ color: 'var(--text-primary)' }}
              >
                <div className="p-1.5 rounded-xl" style={{ backgroundColor: 'var(--bg-primary)' }}>
                  <ArrowLeft size={18} style={{ color: 'var(--text-secondary)' }} />
                </div>
                {state.title || 'Назад'}
              </Link>
            ) : (
              <Link to="/" className="font-bold text-lg text-indigo-600 tracking-tight">
                ServiceApp
              </Link>
            )}
            {user && (
              <div className="flex items-center gap-2">
                <BellButton />
                <Link
                  to={`/profile/${user.id}`}
                  className="flex items-center gap-2 text-sm transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center">
                    <User size={14} className="text-indigo-600" />
                  </div>
                  <span className="hidden sm:inline font-medium">{user.full_name}</span>
                </Link>
              </div>
            )}
          </div>
        </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-5 py-6 pb-24">
        <Outlet />
      </main>

      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 flex">
          <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="w-72 bg-white shadow-xl border-l border-gray-100 p-5 overflow-y-auto" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-gray-900">Все разделы</span>
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-1">
              {availableItems.map((item) => {
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      active
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <item.icon size={18} strokeWidth={active ? 2.5 : 1.8} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <ToastNotifications />
      <InstallPrompt />

      {user && (
        <nav
          className="fixed bottom-0 left-0 right-0 z-10 border-t"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--bg-card) 80%, transparent)',
            backdropFilter: 'blur(12px)',
            borderColor: 'var(--border)',
          }}
        >
          <div className="max-w-lg mx-auto px-2 h-16 flex items-center justify-around">
            {bottomItems.map((item) => (
              <NavLink
                key={item.id}
                to={item.path}
                label={item.label}
                icon={item.icon}
                active={isActive(item.path)}
              />
            ))}
            {hasMore && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="flex flex-col items-center gap-0.5 px-3 py-1.5 transition-all"
                style={{ color: 'var(--text-secondary)' }}
              >
                <div className="p-1.5 rounded-xl">
                  <Grid size={20} strokeWidth={1.8} />
                </div>
                <span className="text-[10px] font-medium leading-none opacity-70">Ещё</span>
              </button>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
