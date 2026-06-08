import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePush } from '../contexts/PushContext';
import {
  Bell, Volume2, ArrowRightLeft, CheckCircle2, XCircle, Zap,
  CalendarSync, Building2
} from 'lucide-react';
import { CellToggle, Toggle, Section } from '../components/SettingsUI';
import { api } from '../api/client';

const NOTIF_TYPES: Record<string, { label: string; icon: any }> = {
  swap_created:   { label: 'Новый запрос на обмен', icon: ArrowRightLeft },
  swap_accepted:  { label: 'Обмен принят', icon: CheckCircle2 },
  swap_rejected:  { label: 'Обмен отклонён', icon: XCircle },
  swap_cancelled: { label: 'Обмен отменён', icon: XCircle },
  swap_forced:    { label: 'Принудительный обмен', icon: Zap },
  schedule_update:{ label: 'Изменение графика', icon: CalendarSync },
  welcome:        { label: 'Добро пожаловать', icon: CheckCircle2 },
  center_access:  { label: 'Доступ к центру', icon: Building2 },
};

export default function SettingsNotifications() {
  const { user } = useAuth();
  const { subscribed, supported, permission, subscribe, unsubscribe, error: pushError } = usePush();
  const [pushPrefs, setPushPrefs] = useState<Record<string, boolean>>({});
  const [pushSound, setPushSound] = useState(true);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    setPushPrefs(user.push_prefs || {});
    setPushSound(user.push_sound ?? true);
    setPrefsLoaded(true);
  }, [user]);

  const updatePref = async (key: string, value: boolean) => {
    const next = { ...pushPrefs, [key]: value };
    setPushPrefs(next);
    try { await api.put('/push/preferences', { prefs: next }); } catch {}
  };

  const toggleSound = async () => {
    const next = !pushSound;
    setPushSound(next);
    try { await api.put('/push/preferences', { sound: next }); } catch {}
  };

  if (!prefsLoaded) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Уведомления</h1>

      {supported && (
        <Section title="PUSH-УВЕДОМЛЕНИЯ">
          <CellToggle icon={Bell} label="Push-уведомления" value={subscribed} onChange={subscribed ? unsubscribe : subscribe} disabled={permission === 'denied'} />
          <CellToggle icon={Volume2} label="Звук" value={pushSound} onChange={toggleSound} />
          {pushError && (
            <div className="px-5 py-2 text-xs text-red-500" style={{ backgroundColor: 'var(--bg-card)' }}>{pushError}</div>
          )}
        </Section>
      )}

      <Section title="ТИПЫ УВЕДОМЛЕНИЙ">
        <div className="px-5 py-3 space-y-3" style={{ backgroundColor: 'var(--bg-card)' }}>
          {Object.entries(NOTIF_TYPES).map(([key, { label, icon: Icon }]) => {
            const enabled = pushPrefs[key] !== false;
            return (
              <div key={key} className="flex items-center gap-3 min-h-[36px]">
                <Icon size={16} style={{ color: enabled ? 'var(--accent)' : 'var(--text-disabled)' }} />
                <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>{label}</span>
                <Toggle value={enabled} onChange={() => updatePref(key, !enabled)} />
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}
