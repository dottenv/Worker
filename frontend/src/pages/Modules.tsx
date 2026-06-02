import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Wallet, CheckCircle2, AlertCircle, Zap
} from 'lucide-react';
import { api } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';

const MODULES = [
  {
    id: 'finance',
    name: 'Финансы',
    icon: Wallet,
    description: 'Управление балансом, операциями и детализацией по сотрудникам',
    features: ['Просмотр баланса', 'История операций', 'Авансы и выплаты', 'Корректировки'],
  },
];

export default function Modules() {
  const { user, isOwner } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [localFinance, setLocalFinance] = useState(false);

  useEffect(() => {
    if (user) {
      setLocalFinance(user.finance_enabled || false);
    }
  }, [user]);

  if (!user) return <LoadingSpinner />;

  if (!isOwner) {
    return (
      <div className="space-y-5">
        <button onClick={() => navigate('/settings')}
          className="flex items-center gap-2 text-sm font-medium"
          style={{ color: 'var(--text-secondary)' }}>
          <ArrowLeft size={16} />
          Назад
        </button>
        <div className="text-center py-8">
          <AlertCircle size={32} className="mx-auto mb-3" style={{ color: 'var(--text-disabled)' }} />
          <p style={{ color: 'var(--text-primary)' }}>Доступ только для владельцев</p>
        </div>
      </div>
    );
  }

  const handleToggleModule = async (moduleId: string, enabled: boolean) => {
    setSaving(true);
    setMessage('');
    try {
      if (moduleId === 'finance') {
        await api.finance.toggle(!enabled);
        setLocalFinance(!enabled);
      }
      setIsSuccess(true);
      setMessage('Сохранено');
    } catch (err: any) {
      setIsSuccess(false);
      setMessage(err.message || 'Ошибка');
    }
    setSaving(false);
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate('/settings')}
          className="p-2 rounded-lg transition-colors"
          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Модули</h1>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Управление функционалом для сотрудников</p>
        </div>
      </div>

      <div className="rounded-2xl p-5 flex items-center gap-3 border" 
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <Zap size={20} style={{ color: 'var(--accent)' }} />
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Активные модули</p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {[localFinance].filter(Boolean).length} / {MODULES.length}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {MODULES.map((module) => {
          const Icon = module.icon;
          const enabled = localFinance;

          return (
            <div key={module.id}
              className="rounded-2xl p-4 border"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <Icon size={18} style={{ color: 'var(--accent)' }} />
                  </div>
                  <div>
                    <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {module.name}
                    </h3>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                      {module.description}
                    </p>
                  </div>
                </div>
                <button onClick={() => handleToggleModule(module.id, enabled)}
                  disabled={saving}
                  className={`relative w-12 h-6 rounded-full transition-colors shrink-0 disabled:opacity-50`}
                  style={{ backgroundColor: enabled ? 'var(--accent)' : 'var(--bg-tertiary)', borderColor: 'var(--border)', border: '1px solid' }}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-6' : ''}`} />
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {module.features.map((feature) => (
                  <span key={feature}
                    className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg"
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                    <CheckCircle2 size={12} />
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {message && (
        <div className={`flex items-center gap-2 text-sm p-4 rounded-xl border ${
          isSuccess ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
        }`} style={{ borderColor: isSuccess ? '#d1fae5' : '#fee2e2' }}>
          {isSuccess ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {message}
        </div>
      )}

      <div className="text-center py-4">
        <p className="text-xs" style={{ color: 'var(--text-disabled)' }}>
          Включение модуля открывает доступ сотрудникам к соответствующему функционалу
        </p>
      </div>
    </div>
  );
}
