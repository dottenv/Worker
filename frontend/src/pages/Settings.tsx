import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { usePush } from '../contexts/PushContext';
import { useCenters } from '../contexts/CenterContext';
import {
  Building2, Bell, Volume2,
  ArrowRightLeft, CalendarSync, CheckCircle2, XCircle, Zap,
  Copy, Check, ChevronRight, Palette, Wallet
} from 'lucide-react';
import { api } from '../api/client';
import { getAvailableItems } from '../config/navItems';
import LoadingSpinner from '../components/LoadingSpinner';

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

function Toggle({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button onClick={() => onChange(!value)} disabled={disabled}
      className="relative w-[51px] h-[31px] rounded-full transition-colors shrink-0 disabled:opacity-50"
      style={{ backgroundColor: value ? 'var(--accent)' : '#e5e5ea' }}>
      <span className={`absolute top-[2px] left-[2px] w-[27px] h-[27px] bg-white rounded-full shadow transition-transform duration-200 ${value ? 'translate-x-5' : ''}`} />
    </button>
  );
}

function Cell({ icon: Icon, label, value, href, onClick }: { icon: any; label: string; value?: string; href?: string; onClick?: () => void }) {
  const content = (
    <div className="flex items-center gap-3 px-4 py-3 min-h-[44px]" style={{ backgroundColor: 'var(--bg-card)' }}>
      <Icon size={20} style={{ color: 'var(--accent)' }} />
      <span className="flex-1 text-[15px]" style={{ color: 'var(--text-primary)' }}>{label}</span>
      {value && <span className="text-[15px] text-gray-400">{value}</span>}
      {onClick && <ChevronRight size={16} className="text-gray-400" />}
    </div>
  );
  if (href) return <a href={href} className="block border-b" style={{ borderColor: 'var(--border)' }}>{content}</a>;
  return <div className="block border-b" style={{ borderColor: 'var(--border)' }} onClick={onClick}>{content}</div>;
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      {title && (
        <p className="text-[13px] font-semibold uppercase tracking-wide px-4 mb-1.5" style={{ color: 'var(--text-secondary)' }}>{title}</p>
      )}
      <div className="rounded-xl overflow-hidden mx-3" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        {children}
      </div>
    </div>
  );
}

function CellToggle({ icon: Icon, label, value, onChange, disabled }: { icon: any; label: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b min-h-[44px]" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
      <Icon size={20} style={{ color: 'var(--accent)' }} />
      <span className="flex-1 text-[15px]" style={{ color: 'var(--text-primary)' }}>{label}</span>
      <Toggle value={value} onChange={onChange} disabled={disabled} />
    </div>
  );
}

export default function Settings() {
  const { user, isOwner, refreshUser } = useAuth();
  const { mode, setMode } = useTheme();
  const { subscribed, supported, permission, subscribe, unsubscribe, error: pushError } = usePush();
  const { centers, activeCenter, setActiveCenterId } = useCenters();
  const [copied, setCopied] = useState(false);
  const buildHash = import.meta.env.VITE_GIT_HASH || 'unknown';

  const [pushPrefs, setPushPrefs] = useState<Record<string, boolean>>({});
  const [pushSound, setPushSound] = useState(true);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  const [financeAvailable, setFinanceAvailable] = useState(false);
  const [localFinance, setLocalFinance] = useState(false);

  const [navPinned, setNavPinned] = useState<string[]>([]);
  const [navSaving, setNavSaving] = useState(false);
  const [navMessage, setNavMessage] = useState('');

  const [editingProfile, setEditingProfile] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    if (!user) return;
    setPushPrefs(user.push_prefs || {});
    setPushSound(user.push_sound ?? true);
    setPrefsLoaded(true);
    setFullName(user.full_name);
    setEmail(user.email);
    setPhone(user.phone || '');
  }, [user]);

  useEffect(() => {
    api.get('/finance/status').then(r => { setFinanceAvailable(r.available); setLocalFinance(r.finance_enabled); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user?.nav_config?.pinned) return;
    setNavPinned(user.nav_config.pinned);
  }, [user]);

  const copyBuildHash = () => {
    navigator.clipboard.writeText(buildHash).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => {});
  };

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

  const saveProfile = async () => {
    if (!fullName.trim()) { setSaveMsg('Введите ФИО'); return; }
    if (!email.trim()) { setSaveMsg('Введите email'); return; }
    if (password && password !== passwordConfirm) { setSaveMsg('Пароли не совпадают'); return; }
    if (password && password.length < 6) { setSaveMsg('Пароль минимум 6 символов'); return; }
    setSaving(true);
    try {
      const p: any = { full_name: fullName, email, phone: phone || null };
      if (password) p.password = password;
      await api.put('/auth/profile', p);
      refreshUser();
      setPassword(''); setPasswordConfirm('');
      setEditingProfile(false); setSaveMsg(''); setSaving(false);
    } catch (err: any) {
      setSaveMsg(err.message); setSaving(false);
    }
  };

  const toggleFinance = async () => {
    const next = !localFinance;
    setLocalFinance(next);
    try { await api.finance.toggle(next); } catch { setLocalFinance(!next); }
  };

  if (!user) return <LoadingSpinner />;

  const modeLabel = mode === 'light' ? 'Светлая' : mode === 'dark' ? 'Тёмная' : 'Авто';

  return (
    <div className="space-y-1 pb-8">
      <div className="px-4 pt-2 pb-4">
        <h1 className="text-[28px] font-bold" style={{ color: 'var(--text-primary)' }}>Настройки</h1>
      </div>

      {/* ПРОФИЛЬ */}
      <Section title={editingProfile ? 'Редактирование профиля' : 'Профиль'}>
        <div className="flex items-center gap-4 px-4 py-4" style={{ backgroundColor: 'var(--bg-card)' }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--accent-bg)' }}>
            <span className="text-xl font-bold" style={{ color: 'var(--accent)' }}>{user.full_name?.slice(0, 1)}</span>
          </div>
          <div className="flex-1">
            <p className="text-[17px] font-semibold" style={{ color: 'var(--text-primary)' }}>{user.full_name}</p>
            <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{user.email}</p>
          </div>
          <button onClick={() => setEditingProfile(!editingProfile)} className="text-[15px] font-medium" style={{ color: 'var(--accent)' }}>
            {editingProfile ? 'Отмена' : 'Изменить'}
          </button>
        </div>
        {editingProfile && (
          <div className="px-4 py-3 space-y-3 border-t" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Имя"
              className="w-full px-3 py-2.5 text-[15px] rounded-xl focus:outline-none" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email"
              className="w-full px-3 py-2.5 text-[15px] rounded-xl focus:outline-none" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Телефон"
              className="w-full px-3 py-2.5 text-[15px] rounded-xl focus:outline-none" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Новый пароль"
              className="w-full px-3 py-2.5 text-[15px] rounded-xl focus:outline-none" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
            <input type="password" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} placeholder="Повторите пароль"
              className="w-full px-3 py-2.5 text-[15px] rounded-xl focus:outline-none" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
            {saveMsg && <p className="text-[13px] text-red-500">{saveMsg}</p>}
            <button onClick={saveProfile} disabled={saving}
              className="w-full py-2.5 rounded-xl text-[15px] font-medium text-white transition-opacity disabled:opacity-50"
              style={{ backgroundColor: 'var(--accent)' }}>
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        )}
      </Section>

      {/* ПРИЛОЖЕНИЕ */}
      <Section title="Приложение">
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
          <div className="flex items-center gap-3 px-4 py-3 min-h-[44px]" style={{ backgroundColor: 'var(--bg-card)' }}>
            <Wallet size={20} style={{ color: 'var(--accent)' }} />
            <span className="flex-1 text-[15px]" style={{ color: 'var(--text-primary)' }}>Финансы</span>
            <Toggle value={localFinance} onChange={toggleFinance} />
          </div>
        )}
      </Section>

      {/* НАВИГАЦИЯ */}
      <Section title="Нижняя навигация">
        <div className="px-4 py-2" style={{ backgroundColor: 'var(--bg-card)' }}>
          <p className="text-[13px] mb-2" style={{ color: 'var(--text-secondary)' }}>Первые 5 — в панели снизу, остальные в меню «Ещё»</p>
          {getAvailableItems(isOwner, financeAvailable).map((item) => {
            const isPinned = navPinned.includes(item.id);
            return (
              <div key={item.id} className="flex items-center gap-2 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
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
                <span className="flex-1 text-[15px]" style={{ color: 'var(--text-primary)' }}>{item.label}</span>
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
            className="w-full mt-2 py-2.5 rounded-xl text-[15px] font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent)' }}>
            {navSaving ? '...' : navMessage || 'Сохранить'}
          </button>
        </div>
      </Section>

      {/* УВЕДОМЛЕНИЯ */}
      {supported && prefsLoaded && (
        <Section title="Уведомления">
          <CellToggle icon={Bell} label="Push-уведомления" value={subscribed} onChange={subscribed ? unsubscribe : subscribe} disabled={permission === 'denied'} />
          <CellToggle icon={Volume2} label="Звук" value={pushSound} onChange={toggleSound} />
          {pushError && (
            <div className="px-4 py-2 text-[13px] text-red-500" style={{ backgroundColor: 'var(--bg-card)' }}>{pushError}</div>
          )}
          <div className="px-4 py-3 space-y-2" style={{ backgroundColor: 'var(--bg-card)' }}>
            <p className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>Типы уведомлений</p>
            {Object.entries(NOTIF_TYPES).map(([key, { label, icon: Icon }]) => {
              const enabled = pushPrefs[key] !== false;
              return (
                <div key={key} className="flex items-center gap-3 min-h-[36px]">
                  <Icon size={16} style={{ color: enabled ? 'var(--accent)' : 'var(--text-disabled)' }} />
                  <span className="flex-1 text-[15px]" style={{ color: 'var(--text-primary)' }}>{label}</span>
                  <Toggle value={enabled} onChange={() => updatePref(key, !enabled)} />
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* ВЕРСИЯ */}
      <div className="flex items-center justify-center gap-1.5 pt-4 pb-8">
        <span className="text-[13px]" style={{ color: 'var(--text-disabled)' }}>Сборка {buildHash}</span>
        <button onClick={copyBuildHash} className="p-0.5" style={{ color: 'var(--text-disabled)' }}>
          {copied ? <Check size={12} /> : <Copy size={12} />}
        </button>
      </div>
    </div>
  );
}
