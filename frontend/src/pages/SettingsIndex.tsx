import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Palette, Grid, Bell, Copy, Check } from 'lucide-react';
import { Cell, Section } from '../components/SettingsUI';

export default function SettingsIndex() {
  const navigate = useNavigate();
  const buildHash = import.meta.env.VITE_GIT_HASH || 'unknown';
  const [copied, setCopied] = useState(false);

  const copyBuildHash = () => {
    navigator.clipboard.writeText(buildHash).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => {});
  };

  return (
    <div className="space-y-1 pb-8">
      <div className="px-4 pt-2 pb-4">
        <h1 className="text-[28px] font-bold" style={{ color: 'var(--text-primary)' }}>Настройки</h1>
      </div>

      <Section>
        <Cell icon={User} label="Профиль" onClick={() => navigate('/settings/profile')} />
        <Cell icon={Palette} label="Приложение" onClick={() => navigate('/settings/app')} />
        <Cell icon={Grid} label="Нижняя навигация" onClick={() => navigate('/settings/navigation')} />
        <Cell icon={Bell} label="Уведомления" onClick={() => navigate('/settings/notifications')} />
      </Section>

      <div className="flex items-center justify-center gap-1.5 pt-4">
        <span className="text-[13px]" style={{ color: 'var(--text-disabled)' }}>Сборка {buildHash}</span>
        <button onClick={copyBuildHash} className="p-0.5" style={{ color: 'var(--text-disabled)' }}>
          {copied ? <Check size={12} /> : <Copy size={12} />}
        </button>
      </div>
    </div>
  );
}
