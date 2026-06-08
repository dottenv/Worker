import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Palette, Grid, Bell, Copy, Check, Building2, X } from 'lucide-react';
import { Cell, Section } from '../components/SettingsUI';
import { useCenters } from '../contexts/CenterContext';

export default function SettingsIndex() {
  const navigate = useNavigate();
  const buildHash = import.meta.env.VITE_GIT_HASH || 'unknown';
  const [copied, setCopied] = useState(false);
  const [showCenters, setShowCenters] = useState(false);
  const { centers, activeCenter, setActiveCenterId } = useCenters();

  const copyBuildHash = () => {
    navigator.clipboard.writeText(buildHash).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => {});
  };

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Настройки</h1>

      <div className="rounded-2xl overflow-hidden cursor-pointer active:opacity-60"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
        onClick={() => setShowCenters(true)}>
        <div className="flex items-center gap-3 px-5 py-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--accent-bg)' }}>
            <Building2 size={20} style={{ color: 'var(--accent)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Активный склад</p>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{activeCenter?.name || 'Не выбран'}</p>
          </div>
          <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
            {centers.length}
          </span>
        </div>
      </div>

      <Section>
        <Cell icon={User} label="Профиль" onClick={() => navigate('/settings/profile')} />
        <Cell icon={Palette} label="Приложение" onClick={() => navigate('/settings/app')} />
        <Cell icon={Grid} label="Нижняя навигация" onClick={() => navigate('/settings/navigation')} />
        <Cell icon={Bell} label="Уведомления" onClick={() => navigate('/settings/notifications')} />
      </Section>

      <div className="flex items-center justify-center gap-1.5 pt-2">
        <span className="text-xs" style={{ color: 'var(--text-disabled)' }}>Сборка {buildHash}</span>
        <button onClick={copyBuildHash} className="p-0.5" style={{ color: 'var(--text-disabled)' }}>
          {copied ? <Check size={12} /> : <Copy size={12} />}
        </button>
      </div>

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
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{c.role === 'owner' ? 'Владелец' : c.role === 'admin' ? 'Админ' : 'Сотрудник'}</span>
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
