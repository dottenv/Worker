import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Palette, Grid, Bell, Copy, Check, Building2 } from 'lucide-react';
import { Cell, Section } from '../components/SettingsUI';
import { useCenters } from '../contexts/CenterContext';

export default function SettingsIndex() {
  const navigate = useNavigate();
  const buildHash = import.meta.env.VITE_GIT_HASH || 'unknown';
  const [copied, setCopied] = useState(false);
  const { centers, activeCenter, setActiveCenterId } = useCenters();

  const copyBuildHash = () => {
    navigator.clipboard.writeText(buildHash).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => {});
  };

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Настройки</h1>

      <div className="relative">
        <select value={activeCenter?.id || ''} onChange={e => setActiveCenterId(Number(e.target.value))}
          className="w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 appearance-none cursor-pointer transition-colors"
          style={{
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            paddingLeft: '2.75rem',
          }}>
          {centers.map(c => (
            <option key={c.id} value={c.id}>{c.address ? `${c.name} (${c.address})` : c.name}</option>
          ))}
        </select>
        <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-secondary)' }} />
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
    </div>
  );
}
