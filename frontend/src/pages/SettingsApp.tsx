import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useCenters } from '../contexts/CenterContext';
import { Building2, Palette, Wallet, Check, X } from 'lucide-react';
import { Cell, Toggle, Section } from '../components/SettingsUI';
import { api } from '../api/client';

export default function SettingsApp() {
  const { isOwner } = useAuth();
  const { mode, setMode } = useTheme();
  const { centers, activeCenter, setActiveCenterId } = useCenters();
  const [localFinance, setLocalFinance] = useState(false);
  const [showCenters, setShowCenters] = useState(false);

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
        <Cell icon={Building2} label="Активный склад" value={activeCenter?.name || 'Не выбран'} onClick={() => setShowCenters(true)} />
        <Cell icon={Palette} label="Тема" value={modeLabel} onClick={() => {
          const next = mode === 'light' ? 'dark' as const : mode === 'dark' ? 'auto' as const : 'light' as const;
          setMode(next);
        }} />
        {isOwner && (
          <div className="flex items-center gap-3 px-5 py-3.5" style={{ backgroundColor: 'var(--bg-card)' }}>
            <Wallet size={20} style={{ color: 'var(--accent)' }} />
            <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>Финансы</span>
            <Toggle value={localFinance} onChange={toggleFinance} />
          </div>
        )}
      </Section>

      {showCenters && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-20 p-5 animate-modal-overlay"
          onClick={() => setShowCenters(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl animate-modal-body"
            style={{ backgroundColor: 'var(--bg-card)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <span className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Выберите склад</span>
              <button onClick={() => setShowCenters(false)} className="p-1 rounded-lg hover:opacity-70" style={{ color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {centers.map((c) => {
                const active = c.id === activeCenter?.id;
                return (
                  <button key={c.id} onClick={() => { setActiveCenterId(c.id); setShowCenters(false); }}
                    className="w-full flex items-center gap-3 px-5 py-3.5 border-b text-left last:border-b-0 hover:opacity-80 transition-opacity"
                    style={{ borderColor: 'var(--border)', backgroundColor: active ? 'var(--bg-tertiary)' : 'transparent' }}>
                    <Building2 size={18} style={{ color: active ? 'var(--accent)' : 'var(--text-disabled)' }} />
                    <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>{c.address ? `${c.name} (${c.address})` : c.name}</span>
                    {active && <Check size={18} style={{ color: 'var(--accent)' }} />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
