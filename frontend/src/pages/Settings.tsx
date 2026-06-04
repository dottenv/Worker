import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { usePush } from '../contexts/PushContext';
import { useCenters } from '../contexts/CenterContext';
import {
  User, Building2, Save,
  CheckCircle2, AlertCircle, Sun, Moon, Monitor,
  Bell, BellOff, Volume2, VolumeX, ArrowRightLeft,
  CalendarSync, Building2 as BuildingIcon, Zap, XCircle, Eye, EyeOff,
  ChevronUp, ChevronDown, Copy, Check, Wallet, Bot,
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
  welcome:        { label: 'Добро пожаловать', icon: Bell },
  center_access:  { label: 'Доступ к центру', icon: BuildingIcon },
};

export default function Settings() {
  const { user, isOwner, refreshUser } = useAuth();
  const { mode, setMode } = useTheme();
  const { subscribed, supported, permission, subscribe, unsubscribe, error: pushError } = usePush();
  const { centers, activeCenterId, setActiveCenterId } = useCenters();
  const [copied, setCopied] = useState(false);
  const buildHash = import.meta.env.VITE_GIT_HASH || 'unknown';

  const copyBuildHash = () => {
    navigator.clipboard.writeText(buildHash).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const [pushPrefs, setPushPrefs] = useState<Record<string, boolean>>({});
  const [pushSound, setPushSound] = useState(true);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    setPushPrefs(user.push_prefs || {});
    setPushSound(user.push_sound ?? true);
    setPrefsLoaded(true);
  }, [user]);

  const [financeAvailable, setFinanceAvailable] = useState(false);
  const [navPinned, setNavPinned] = useState<string[]>([]);
  const [navSaving, setNavSaving] = useState(false);
  const [navMessage, setNavMessage] = useState('');

  const [tgBotToken, setTgBotToken] = useState('');
  const [tgBotEnabled, setTgBotEnabled] = useState(false);
  const [tgStorageChatId, setTgStorageChatId] = useState('');
  const [tgStorageTopicId, setTgStorageTopicId] = useState('');
  const [tgChatInfo, setTgChatInfo] = useState<{ id: number; title: string; type: string; is_forum: boolean } | null>(null);
  const [tgKnownTopics, setTgKnownTopics] = useState<Record<string, string>>({});
  const [tgVerifying, setTgVerifying] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');
  const [tgSaving, setTgSaving] = useState(false);
  const [tgMessage, setTgMessage] = useState('');
  const [tgIsSuccess, setTgIsSuccess] = useState(false);

  const [localFinance, setLocalFinance] = useState(false);
  const [financeSaving, setFinanceSaving] = useState(false);

  useEffect(() => {
    api.get('/finance/status').then(res => {
      setFinanceAvailable(res.available);
      setLocalFinance(res.finance_enabled);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    api.settings.list().then(res => {
      if (res.telegram_bot_token !== undefined) setTgBotToken(res.telegram_bot_token);
      if (res.telegram_bot_enabled !== undefined) setTgBotEnabled(res.telegram_bot_enabled === 'true');
      if (res.telegram_storage_chat_id !== undefined) setTgStorageChatId(res.telegram_storage_chat_id);
      if (res.telegram_storage_topic_id !== undefined) setTgStorageTopicId(res.telegram_storage_topic_id);
      if (res.base_url !== undefined) setBaseUrl(res.base_url);
    }).catch(() => {});
    api.settings.getTopics().then(res => {
      if (res.topics) setTgKnownTopics(res.topics);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user?.nav_config?.pinned) return;
    setNavPinned(user.nav_config.pinned);
  }, [user]);

  // Форматирование номера телефона
  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';
    
    let formatted = digits;
    if (digits.length > 0) {
      if (digits.startsWith('7') || digits.startsWith('8')) {
        formatted = '+' + digits.slice(0, 1) + ' (' + digits.slice(1, 4);
        if (digits.length > 4) formatted += ') ' + digits.slice(4, 7);
        if (digits.length > 7) formatted += '-' + digits.slice(7, 9);
        if (digits.length > 9) formatted += '-' + digits.slice(9, 11);
      }
    }
    return formatted;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    // Валидация
    if (!fullName.trim()) {
      setIsSuccess(false);
      setMessage('Введите ФИО');
      setSaving(false);
      return;
    }
    if (!email.trim()) {
      setIsSuccess(false);
      setMessage('Введите email');
      setSaving(false);
      return;
    }
    if (password && password !== passwordConfirm) {
      setIsSuccess(false);
      setMessage('Пароли не совпадают');
      setSaving(false);
      return;
    }
    if (password && password.length < 6) {
      setIsSuccess(false);
      setMessage('Пароль должен быть минимум 6 символов');
      setSaving(false);
      return;
    }

    try {
      const payload: any = {
        full_name: fullName,
        email: email,
        phone: phone || null,
      };
      if (password) {
        payload.password = password;
      }

      await api.put('/auth/profile', payload);
      setIsSuccess(true);
      setMessage('Данные сохранены');
      setPassword('');
      setPasswordConfirm('');
    } catch (err: any) {
      setIsSuccess(false);
      setMessage(err.response?.data?.error || err.message || 'Ошибка сохранения');
    }
    setSaving(false);
    setTimeout(() => setMessage(''), 4000);
  };

  if (!user) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Настройки</h1>
      </div>

      {/* ПРОФИЛЬ */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="p-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-xs font-semibold uppercase mb-3" style={{ color: 'var(--text-secondary)' }}>Профиль</h3>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--accent-bg)' }}>
              <User size={20} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{user.full_name}</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{user.email}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-3">
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Имя и фамилия</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
          </div>

          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
          </div>

          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Телефон</label>
            <input type="tel" value={phone} onChange={handlePhoneChange} placeholder="+7 (999) 123-45-67"
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
          </div>

          <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
            <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>Изменить пароль (опционально)</p>
            
            <div className="mb-3 relative">
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Новый пароль</label>
              <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 pr-9 rounded-lg text-sm focus:outline-none focus:ring-2"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[30px]"
                style={{ color: 'var(--text-secondary)' }}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div className="relative">
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Подтверждение пароля</label>
              <input type={showPasswordConfirm ? "text" : "password"} value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)}
                className="w-full px-3 py-2 pr-9 rounded-lg text-sm focus:outline-none focus:ring-2"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
              <button type="button" onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                className="absolute right-3 top-[30px]"
                style={{ color: 'var(--text-secondary)' }}>
                {showPasswordConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={saving}
            className="w-full py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
            <Save size={14} />
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
          {message && (
            <div className={`flex items-center gap-2 text-xs p-2.5 rounded-lg ${isSuccess ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
              {isSuccess ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              {message}
            </div>
          )}
        </form>
      </div>

      {/* ОБЩИЕ НАСТРОЙКИ */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="p-5">
          <h3 className="text-xs font-semibold uppercase mb-3" style={{ color: 'var(--text-secondary)' }}>Общие</h3>
          
          {/* Склад */}
          <div className="mb-4">
            <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>Текущий склад</label>
            <div className="relative">
              <select value={activeCenterId || ''}
                onChange={(e) => setActiveCenterId(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                {centers.map((c) => (
                  <option key={c.id} value={c.id}>{c.address ? `${c.name} (${c.address})` : c.name} {c.role === 'owner' ? '(владелец)' : ''}</option>
                ))}
              </select>
              <Building2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-disabled)' }} />
            </div>
          </div>

          {/* Тема */}
          <div>
            <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>Тема оформления</label>
            <div className="flex gap-2">
              {[
                { value: 'light' as const, label: 'Светлая', icon: Sun },
                { value: 'dark' as const, label: 'Тёмная', icon: Moon },
                { value: 'auto' as const, label: 'Авто', icon: Monitor },
              ].map((opt) => {
                const Icon = opt.icon;
                const active = mode === opt.value;
                return (
                  <button key={opt.value} onClick={() => setMode(opt.value)}
                    className={`flex-1 flex flex-col items-center gap-1 p-2.5 rounded-lg text-xs font-medium transition-all`}
                    style={{
                      color: active ? 'var(--accent)' : 'var(--text-secondary)',
                      backgroundColor: active ? 'var(--accent-bg)' : 'var(--bg-tertiary)',
                      border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
                    }}>
                    <Icon size={16} />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {isOwner && (
            <div className="flex items-center justify-between p-3 rounded-lg mt-3" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <div className="flex items-center gap-2">
                <Wallet size={16} style={{ color: 'var(--accent)' }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Финансы</p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Баланс и операции</p>
                </div>
              </div>
              <button
                onClick={async () => {
                  setFinanceSaving(true);
                  try {
                    const res = await api.finance.toggle(!localFinance);
                    setLocalFinance(res.finance_enabled);
                  } catch {}
                  setFinanceSaving(false);
                }}
                disabled={financeSaving}
                className={`relative w-10 h-6 rounded-full transition-colors shrink-0 disabled:opacity-50`}
                style={{ backgroundColor: localFinance ? 'var(--accent)' : 'var(--bg-secondary)' }}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${localFinance ? 'translate-x-4' : ''}`} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* НАВИГАЦИЯ */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="p-5">
          <h3 className="text-xs font-semibold uppercase mb-3" style={{ color: 'var(--text-secondary)' }}>Навигация</h3>
          <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
            Первые 5 закреплённых разделов отображаются в нижней панели. Остальные — в меню «Ещё».
          </p>
          <div className="space-y-1 mb-3">
            {getAvailableItems(isOwner, financeAvailable).map((item, idx) => {
              const isPinned = navPinned.includes(item.id);
              return (
                <div key={item.id}
                  className="flex items-center gap-2 p-2.5 rounded-lg"
                  style={{ backgroundColor: isPinned ? 'var(--accent-bg)' : 'var(--bg-tertiary)' }}>
                  <button
                    onClick={() => {
                      const idxInList = navPinned.indexOf(item.id);
                      if (idxInList > 0) {
                        const next = [...navPinned];
                        [next[idxInList - 1], next[idxInList]] = [next[idxInList], next[idxInList - 1]];
                        setNavPinned(next);
                      }
                    }}
                    disabled={!isPinned || navPinned.indexOf(item.id) <= 0}
                    className="p-0.5 rounded disabled:opacity-20 hover:opacity-60"
                    style={{ color: 'var(--text-secondary)' }}>
                    <ChevronUp size={14} />
                  </button>
                  <button
                    onClick={() => {
                      const idxInList = navPinned.indexOf(item.id);
                      if (idxInList >= 0 && idxInList < navPinned.length - 1) {
                        const next = [...navPinned];
                        [next[idxInList], next[idxInList + 1]] = [next[idxInList + 1], next[idxInList]];
                        setNavPinned(next);
                      }
                    }}
                    disabled={!isPinned || navPinned.indexOf(item.id) >= navPinned.length - 1}
                    className="p-0.5 rounded disabled:opacity-20 hover:opacity-60"
                    style={{ color: 'var(--text-secondary)' }}>
                    <ChevronDown size={14} />
                  </button>
                  <item.icon size={16} style={{ color: isPinned ? 'var(--accent)' : 'var(--text-disabled)' }} />
                  <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>{item.label}</span>
                  <div className="flex items-center gap-1">
                    {idx < 5 && isPinned && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--accent)' }}>
                        {idx + 1}
                      </span>
                    )}
                    <button
                      onClick={() => {
                        if (isPinned) {
                          setNavPinned(navPinned.filter(id => id !== item.id));
                        } else {
                          setNavPinned([...navPinned, item.id]);
                        }
                      }}
                      className={`relative w-8 h-5 rounded-full transition-colors shrink-0`}
                      style={{ backgroundColor: isPinned ? 'var(--accent)' : 'var(--bg-secondary)' }}>
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isPinned ? 'translate-x-3.5' : ''}`} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <button
            onClick={async () => {
              if (!user) return;
              setNavSaving(true);
              setNavMessage('');
                try {
                  await api.auth.navConfig.update(navPinned);
                  refreshUser();
                  setNavMessage('Сохранено');
                } catch (err: any) {
                setNavMessage(err.message);
              }
              setNavSaving(false);
              setTimeout(() => setNavMessage(''), 3000);
            }}
            disabled={navSaving}
            className="w-full py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
            <Save size={14} />
            {navSaving ? 'Сохранение...' : 'Сохранить настройки навигации'}
          </button>
          {navMessage && (
            <div className={`flex items-center gap-1.5 mt-2 text-xs ${navMessage === 'Сохранено' ? 'text-emerald-600' : 'text-red-500'}`}>
              {navMessage === 'Сохранено' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
              {navMessage}
            </div>
          )}
        </div>
      </div>

      {/* УВЕДОМЛЕНИЯ */}
      {supported && prefsLoaded && (
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="p-5">
            <h3 className="text-xs font-semibold uppercase mb-3" style={{ color: 'var(--text-secondary)' }}>Уведомления</h3>

            {/* Главный выключатель */}
            <div className="flex items-center justify-between mb-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <div className="flex items-center gap-2">
                {subscribed ? <Bell size={16} style={{ color: 'var(--accent)' }} /> : <BellOff size={16} style={{ color: 'var(--text-disabled)' }} />}
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{subscribed ? 'Включены' : 'Выключены'}</p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Push-уведомления</p>
                </div>
              </div>
              <button onClick={subscribed ? unsubscribe : subscribe}
                disabled={permission === "denied"}
                className={`relative w-10 h-6 rounded-full transition-colors shrink-0 disabled:opacity-50`}
                style={{ backgroundColor: subscribed ? 'var(--accent)' : 'var(--bg-secondary)' }}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${subscribed ? 'translate-x-4' : ''}`} />
              </button>
            </div>

            {pushError && (
              <p className="text-xs p-2 mb-3 rounded-lg" style={{ backgroundColor: 'var(--error-bg, #fee2e2)', color: 'var(--error)' }}>
                {pushError}
              </p>
            )}

            {/* Звук */}
            <div className="flex items-center justify-between mb-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <div className="flex items-center gap-2">
                {pushSound ? <Volume2 size={16} style={{ color: 'var(--accent)' }} /> : <VolumeX size={16} style={{ color: 'var(--text-disabled)' }} />}
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Звук</p>
              </div>
              <button onClick={toggleSound}
                className={`relative w-10 h-6 rounded-full transition-colors shrink-0`}
                style={{ backgroundColor: pushSound ? 'var(--accent)' : 'var(--bg-secondary)' }}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${pushSound ? 'translate-x-4' : ''}`} />
              </button>
            </div>

            {/* Типы компактно в 2 колонки */}
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Типы</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(NOTIF_TYPES).map(([key, { label, icon: Icon }]) => {
                  const enabled = pushPrefs[key] !== false;
                  return (
                    <button key={key}
                      onClick={() => updatePref(key, !enabled)}
                      className="flex items-center gap-2 p-2.5 rounded-lg text-xs transition-colors"
                      style={{
                        backgroundColor: enabled ? 'var(--accent-bg)' : 'var(--bg-tertiary)',
                        color: enabled ? 'var(--accent)' : 'var(--text-secondary)',
                        border: enabled ? '1px solid var(--accent)' : '1px solid var(--border)',
                      }}>
                      <Icon size={13} className="shrink-0" />
                      <span className="truncate">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {permission === "denied" && (
              <p className="text-xs p-2 rounded-lg mt-3" style={{ backgroundColor: 'var(--error-bg, #fee2e2)', color: 'var(--error)' }}>
                Заблокированы в браузере. Разрешите в настройках сайта.
              </p>
            )}
          </div>
        </div>
      )}


      {/* TELEGRAM БОТ */}
      {isOwner && (
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="p-5">
            <h3 className="text-xs font-semibold uppercase mb-3" style={{ color: 'var(--text-secondary)' }}>Telegram Бот</h3>

            <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Bot size={16} style={{ color: tgBotEnabled ? 'var(--accent)' : 'var(--text-disabled)' }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Telegram Bot</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{tgBotEnabled ? 'Включён' : 'Выключен'}</p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const next = !tgBotEnabled;
                    setTgBotEnabled(next);
                    try {
                      await api.settings.update({ telegram_bot_enabled: String(next), telegram_bot_token: tgBotToken, base_url: baseUrl });
                      await api.settings.syncBot();
                    } catch { setTgBotEnabled(!next); }
                  }}
                  className={`relative w-10 h-6 rounded-full transition-colors shrink-0`}
                  style={{ backgroundColor: tgBotEnabled ? 'var(--accent)' : 'var(--bg-secondary)' }}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${tgBotEnabled ? 'translate-x-4' : ''}`} />
                </button>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Токен бота</label>
                  <input type="password" value={tgBotToken} onChange={e => setTgBotToken(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-2"
                    style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
                </div>

                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Chat ID для документов</label>
                  <div className="flex gap-1.5">
                    <input type="text" value={tgStorageChatId} onChange={e => { setTgStorageChatId(e.target.value); setTgChatInfo(null); }}
                      placeholder="-100123456789"
                      className="flex-1 px-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-2"
                      style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
                    <button onClick={async () => {
                      setTgVerifying(true);
                      try {
                        const info = await api.settings.verifyChat(tgStorageChatId);
                        setTgChatInfo(info);
                        if (info.is_forum) {
                          try {
                            const ft = await api.settings.forumTopics(tgStorageChatId);
                            if (ft.topics) setTgKnownTopics(ft.topics);
                          } catch {}
                        }
                        const topics = await api.settings.getTopics();
                        if (topics.topics) setTgKnownTopics(prev => ({...prev, ...topics.topics}));
                      } catch { setTgChatInfo(null); }
                      setTgVerifying(false);
                    }}
                      disabled={tgVerifying || !tgStorageChatId}
                      className="shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50 transition-colors"
                      style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
                      {tgVerifying ? '...' : 'Проверить'}
                    </button>
                  </div>
                  {tgChatInfo && (
                    <div className="flex items-center gap-1.5 mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <CheckCircle2 size={11} />
                      {tgChatInfo.title}
                      <span className="opacity-50">({tgChatInfo.is_forum ? 'форум' : tgChatInfo.type})</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Тема</label>
                  {Object.keys(tgKnownTopics).length > 0 ? (
                    <div className="flex gap-1.5">
                      <select value={tgStorageTopicId} onChange={e => setTgStorageTopicId(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-2"
                        style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                        <option value="">Без темы (общий чат)</option>
                        {Object.entries(tgKnownTopics).map(([id, name]) => (
                          <option key={id} value={id}>{name}</option>
                        ))}
                      </select>
                      <button onClick={async () => {
                        try {
                          const ft = await api.settings.forumTopics(tgStorageChatId);
                          if (ft.topics) setTgKnownTopics(ft.topics);
                        } catch {}
                        const topics = await api.settings.getTopics();
                        if (topics.topics) setTgKnownTopics(prev => ({...prev, ...topics.topics}));
                      }}
                        className="shrink-0 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors"
                        style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
                        ↻
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-1.5">
                      <input type="text" value={tgStorageTopicId} onChange={e => setTgStorageTopicId(e.target.value)}
                        placeholder="ID темы"
                        className="flex-1 px-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-2"
                        style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
                      <button onClick={async () => {
                        const name = prompt('Название темы:');
                        if (!name) return;
                        const id = prompt('ID темы (message_thread_id):');
                        if (!id) return;
                        try {
                          const res = await api.settings.addTopic(id, name);
                          setTgKnownTopics(res.topics);
                          setTgStorageTopicId(id);
                        } catch {}
                      }}
                        className="shrink-0 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors"
                        style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
                        +
                      </button>
                    </div>
                  )}
                  {tgChatInfo?.is_forum && Object.keys(tgKnownTopics).length === 0 && (
                    <p className="text-xs mt-1" style={{ color: 'var(--text-disabled)' }}>
                      Бот не администратор группы? Добавьте тему вручную через кнопку +.
                      Либо отправьте любое сообщение в нужную тему — ID определится автоматически.
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Base URL</label>
                  <input type="text" value={baseUrl} onChange={e => setBaseUrl(e.target.value)}
                    placeholder="https://xxx.cloudpub.ru"
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-2"
                    style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
                </div>
              </div>

              <button
                onClick={async () => {
                  setTgSaving(true);
                  setTgMessage('');
                  try {
                    await api.settings.update({
                      telegram_bot_token: tgBotToken,
                      telegram_storage_chat_id: tgStorageChatId,
                      telegram_storage_topic_id: tgStorageTopicId,
                      base_url: baseUrl,
                    });
                    await api.settings.syncBot();
                    setTgIsSuccess(true);
                    setTgMessage('Сохранено');
                  } catch (err: unknown) {
                    setTgIsSuccess(false);
                    setTgMessage(err instanceof Error ? err.message : 'Ошибка');
                  }
                  setTgSaving(false);
                  setTimeout(() => setTgMessage(''), 3000);
                }}
                disabled={tgSaving}
                className="w-full mt-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
                <Save size={12} />
                {tgSaving ? 'Сохранение...' : 'Сохранить Telegram настройки'}
              </button>
              {tgMessage && (
                <div className={`flex items-center gap-1.5 mt-1.5 text-xs ${tgIsSuccess ? 'text-emerald-600' : 'text-red-500'}`}>
                  {tgIsSuccess ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                  {tgMessage}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-center gap-1.5 pb-2">
        <span className="text-xs" style={{ color: 'var(--text-disabled)' }}>Сборка {buildHash}</span>
        <button onClick={copyBuildHash} className="p-0.5 rounded hover:opacity-70 transition-opacity" style={{ color: 'var(--text-disabled)' }}>
          {copied ? <Check size={11} /> : <Copy size={11} />}
        </button>
      </div>
    </div>
  );
}