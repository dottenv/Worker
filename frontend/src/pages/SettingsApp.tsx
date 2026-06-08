import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Palette, Wallet } from 'lucide-react';
import { Cell, Toggle, Section } from '../components/SettingsUI';
import { api } from '../api/client';

export default function SettingsApp() {
  const { isOwner, isAdmin } = useAuth();
  const { mode, setMode } = useTheme();
  const [localFinance, setLocalFinance] = useState(false);

  useEffect(() => {
    api.get('/finance/status').then(r => setLocalFinance(r.finance_enabled)).catch(() => {});
  }, []);

  const toggleFinance = async () => {
    const next = !localFinance;
    setLocalFinance(next);
    try { await api.finance.toggle(next); } catch { setLocalFinance(!next); }
  };

  const modeLabel = mode === 'light' ? 'Светлая' : mode === 'dark' ? 'Тёмная' : 'Авто';

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Приложение</h1>

      <Section>
        <Cell icon={Palette} label="Тема" value={modeLabel} onClick={() => {
          const next = mode === 'light' ? 'dark' as const : mode === 'dark' ? 'auto' as const : 'light' as const;
          setMode(next);
        }} />
        {(isOwner || isAdmin) && (
          <div className="flex items-center gap-3 px-5 py-3.5" style={{ backgroundColor: 'var(--bg-card)' }}>
            <Wallet size={20} style={{ color: 'var(--accent)' }} />
            <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>Финансы</span>
            <Toggle value={localFinance} onChange={toggleFinance} />
          </div>
        )}
      </Section>
    </div>
  );
}
