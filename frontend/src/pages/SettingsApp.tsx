import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useCenters } from '../contexts/CenterContext';
import { Building2, Palette, Wallet } from 'lucide-react';
import { Cell, Toggle, Section } from '../components/SettingsUI';
import { api } from '../api/client';

export default function SettingsApp() {
  const { isOwner } = useAuth();
  const { mode, setMode } = useTheme();
  const { centers, activeCenter, setActiveCenterId } = useCenters();
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
    <div className="space-y-1 pb-8">
      <div className="px-4 pt-2 pb-4">
        <h1 className="text-[28px] font-bold" style={{ color: 'var(--text-primary)' }}>Приложение</h1>
      </div>

      <Section>
        <Cell icon={Building2} label="Активный склад" value={activeCenter?.name || 'Не выбран'} onClick={() => {
          const idx = centers.findIndex(c => c.id === activeCenter?.id);
          const next = centers[(idx + 1) % centers.length];
          if (next) setActiveCenterId(next.id);
        }} />
        <Cell icon={Palette} label="Тема" value={modeLabel} onClick={() => {
          const next = mode === 'light' ? 'dark' as const : mode === 'dark' ? 'auto' as const : 'light' as const;
          setMode(next);
        }} />
        {isOwner && (
          <div className="flex items-center gap-3 px-4 py-3 min-h-[44px] border-b" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <Wallet size={20} style={{ color: 'var(--accent)' }} />
            <span className="flex-1 text-[15px]" style={{ color: 'var(--text-primary)' }}>Финансы</span>
            <Toggle value={localFinance} onChange={toggleFinance} />
          </div>
        )}
      </Section>
    </div>
  );
}
