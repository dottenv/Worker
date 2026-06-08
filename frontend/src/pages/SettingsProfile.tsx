import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Section } from '../components/SettingsUI';
import { api } from '../api/client';

export default function SettingsProfile() {
  const { user, refreshUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    if (!user) return;
    setFullName(user.full_name);
    setEmail(user.email);
    setPhone(user.phone || '');
  }, [user]);

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
      setEditing(false); setSaveMsg(''); setSaving(false);
    } catch (err: any) {
      setSaveMsg(err.message); setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Профиль</h1>

      <Section>
        <div className="flex items-center gap-4 px-5 py-4" style={{ backgroundColor: 'var(--bg-card)' }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--accent-bg)' }}>
            <span className="text-xl font-bold" style={{ color: 'var(--accent)' }}>{user.full_name?.slice(0, 1)}</span>
          </div>
          <div className="flex-1">
            <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{user.full_name}</p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{user.email}</p>
          </div>
          <button onClick={() => setEditing(!editing)} className="text-sm font-medium shrink-0" style={{ color: 'var(--accent)' }}>
            {editing ? 'Отмена' : 'Изменить'}
          </button>
        </div>
        {editing && (
          <div className="px-5 py-3 space-y-3 border-t" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Имя"
              className="w-full px-3.5 py-2.5 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email"
              className="w-full px-3.5 py-2.5 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Телефон"
              className="w-full px-3.5 py-2.5 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Новый пароль"
              className="w-full px-3.5 py-2.5 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
            <input type="password" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} placeholder="Повторите пароль"
              className="w-full px-3.5 py-2.5 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
            {saveMsg && <p className="text-xs text-red-500">{saveMsg}</p>}
            <button onClick={saveProfile} disabled={saving}
              className="w-full flex items-center justify-center gap-1.5 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        )}
      </Section>
    </div>
  );
}
