import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Toggle, Section } from '../components/SettingsUI';
import { api } from '../api/client';
import { getAvailableItems } from '../config/navItems';
import LoadingSpinner from '../components/LoadingSpinner';

export default function SettingsNavigation() {
  const { user, isOwner, refreshUser } = useAuth();
  const [navPinned, setNavPinned] = useState<string[]>([]);
  const [navSaving, setNavSaving] = useState(false);
  const [navMessage, setNavMessage] = useState('');
  const [financeAvailable, setFinanceAvailable] = useState(false);

  useEffect(() => {
    if (!user?.nav_config?.pinned) return;
    setNavPinned(user.nav_config.pinned);
  }, [user]);

  useEffect(() => {
    api.get('/finance/status').then(r => setFinanceAvailable(r.available)).catch(() => {});
  }, []);

  if (!user) return <LoadingSpinner />;

  const availableItems = getAvailableItems(isOwner, financeAvailable);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Нижняя навигация</h1>

      <Section>
        <div className="px-5 py-3" style={{ backgroundColor: 'var(--bg-card)' }}>
          <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>Первые 5 — в панели снизу, остальные в меню «Ещё»</p>
          {availableItems.map((item) => {
            const isPinned = navPinned.includes(item.id);
            return (
              <div key={item.id} className="flex items-center gap-2 py-2.5 border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
                <button onClick={() => {
                  const i = navPinned.indexOf(item.id);
                  if (i > 0) { const n = [...navPinned]; [n[i-1], n[i]] = [n[i], n[i-1]]; setNavPinned(n); }
                }} disabled={!isPinned || navPinned.indexOf(item.id) <= 0}
                  className="p-0.5 disabled:opacity-20" style={{ color: 'var(--text-secondary)' }}>↑</button>
                <button onClick={() => {
                  const i = navPinned.indexOf(item.id);
                  if (i >= 0 && i < navPinned.length - 1) { const n = [...navPinned]; [n[i], n[i+1]] = [n[i+1], n[i]]; setNavPinned(n); }
                }} disabled={!isPinned || navPinned.indexOf(item.id) >= navPinned.length - 1}
                  className="p-0.5 disabled:opacity-20" style={{ color: 'var(--text-secondary)' }}>↓</button>
                <item.icon size={18} style={{ color: isPinned ? 'var(--accent)' : 'var(--text-disabled)' }} />
                <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>{item.label}</span>
                <Toggle value={isPinned} onChange={() => {
                  if (isPinned) setNavPinned(navPinned.filter(id => id !== item.id));
                  else setNavPinned([...navPinned, item.id]);
                }} />
              </div>
            );
          })}
          <button onClick={async () => {
            if (!user) return;
            setNavSaving(true);
            try { await api.auth.navConfig.update(navPinned); refreshUser(); setNavMessage('Сохранено'); } catch { setNavMessage('Ошибка'); }
            setNavSaving(false);
            setTimeout(() => setNavMessage(''), 2000);
          }} disabled={navSaving}
            className="w-full mt-3 flex items-center justify-center gap-1.5 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {navSaving ? 'Сохранение...' : navMessage || 'Сохранить'}
          </button>
        </div>
      </Section>
    </div>
  );
}
