import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { useSocketEvent } from '../contexts/SocketContext';
import { Wallet, ArrowUpCircle, ArrowDownCircle, Filter, Calendar, Search, TrendingUp } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import AnimatedCounter from '../components/AnimatedCounter';

interface FinanceOp {
  id: number;
  user_id: number;
  type: string;
  amount: number;
  description: string;
  details: { name: string; price: number }[];
  operation_date: string;
  created_at: string;
}

const CREDIT_TYPES = ['salary', 'adjustment'];

export default function Finance() {
  const [operations, setOperations] = useState<FinanceOp[]>([]);
  const [balance, setBalance] = useState(0);
  const [types, setTypes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [forecast, setForecast] = useState<{ forecast: any[]; total: number } | null>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchOps = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.set('type', typeFilter);
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
      const q = params.toString();
      const res = await api.get(`/finance${q ? '?' + q : ''}`);
      setOperations(res.operations);
      setBalance(res.balance);
      setTypes(res.types);
    } catch {}
    finally { setLoading(false); }
  }, [typeFilter, fromDate, toDate]);

  useEffect(() => { fetchOps(); }, [fetchOps]);

  useEffect(() => {
    api.get('/finance/forecast').then(setForecast).catch(() => {});
  }, []);

  useSocketEvent('finance:updated', () => { fetchOps(); });

  const typeColors: Record<string, string> = {
    advance: 'text-amber-600 bg-amber-50',
    salary: 'text-blue-600 bg-blue-50',
    deduction: 'text-red-600 bg-red-50',
    payment: 'text-purple-600 bg-purple-50',
    adjustment: 'text-emerald-600 bg-emerald-50',
  };

  const typeIcons: Record<string, any> = {
    advance: ArrowDownCircle,
    salary: ArrowUpCircle,
    deduction: ArrowDownCircle,
    payment: ArrowDownCircle,
    adjustment: ArrowUpCircle,
  };

  const applyFilters = () => fetchOps();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Финансы</h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>История операций</p>
      </div>

      <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--accent-bg)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--accent)' }}>
            <Wallet size={22} className="text-white" />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Текущий баланс</p>
            <p className="text-2xl font-bold" style={{ color: balance >= 0 ? 'var(--text-primary)' : 'var(--error)' }}>
              <AnimatedCounter value={balance} />
            </p>
          </div>
        </div>
      </div>

      {forecast && forecast.total > 0 && (
        <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-indigo-500" />
            <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Прогноз</span>
          </div>
          <div className="space-y-1.5">
            {forecast.forecast.slice(0, 5).map((f: any) => (
              <div key={f.id} className="flex items-center justify-between text-xs">
                <span style={{ color: 'var(--text-primary)' }}>
                  {new Date(f.date + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                  {' '}{f.service_center_address ? `${f.service_center_name} (${f.service_center_address})` : f.service_center_name}
                </span>
                <span className="font-medium text-emerald-600">+{f.amount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</span>
              </div>
            ))}
            {forecast.forecast.length > 5 && (
              <p className="text-[10px] text-center" style={{ color: 'var(--text-disabled)' }}>
                + ещё {forecast.forecast.length - 5}
              </p>
            )}
          </div>
          <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between text-sm font-bold">
              <span style={{ color: 'var(--text-primary)' }}>Всего прогноз</span>
              <span className="text-emerald-600">+{forecast.total.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex gap-1.5 flex-wrap">
          {['', 'advance', 'salary', 'deduction', 'payment', 'adjustment'].map(t => (
            <button key={t} onClick={() => { setTypeFilter(t); }}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                typeFilter === t
                  ? 'bg-indigo-100 text-indigo-700'
                  : ''}`}
              style={typeFilter === t ? {} : { color: 'var(--text-secondary)', backgroundColor: 'var(--bg-tertiary)' }}>
              {t === '' ? 'Все' : (types[t] || t)}
            </button>
          ))}
        </div>
        <button onClick={() => setShowFilters(!showFilters)}
          className="p-2 rounded-lg transition-colors"
          style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-tertiary)' }}>
          <Filter size={16} />
        </button>
      </div>

      {showFilters && (
        <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>
                <Calendar size={12} className="inline mr-1" />От
              </label>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>
                <Calendar size={12} className="inline mr-1" />До
              </label>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
            </div>
          </div>
          <button onClick={applyFilters}
            className="flex items-center justify-center gap-1.5 w-full text-sm font-medium py-2 rounded-lg transition-colors"
            style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
            <Search size={14} /> Применить
          </button>
        </div>
      )}

      {loading ? <LoadingSpinner /> : operations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <Wallet size={40} style={{ color: 'var(--text-disabled)' }} />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Нет операций</p>
        </div>
      ) : (
        <div className="space-y-1">
          {operations.map(op => {
            const Icon = typeIcons[op.type] || ArrowUpCircle;
            const tc = typeColors[op.type] || 'text-gray-600 bg-gray-50';
            const isCredit = CREDIT_TYPES.includes(op.type);
            return (
              <div key={op.id} className="rounded-xl p-4 transition-colors"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg shrink-0 ${tc}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {types[op.type] || op.type}
                      </p>
                      <p className={`text-sm font-bold shrink-0 ml-2 ${isCredit ? 'text-emerald-600' : 'text-red-500'}`}>
                        {isCredit ? '+' : '-'}{op.amount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
                      </p>
                    </div>
                    {op.description && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        {op.description}
                      </p>
                    )}
                    {op.details && op.details.length > 0 && (
                      <div className="mt-1.5 space-y-0.5">
                        {op.details.map((d: any, i: number) => (
                          <p key={i} className="text-[10px] flex items-center gap-1" style={{ color: 'var(--text-disabled)' }}>
                            <span className="inline-block w-1 h-1 rounded-full" style={{ backgroundColor: 'var(--text-disabled)' }} />
                            {d.name}: {Number(d.price).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
                          </p>
                        ))}
                      </div>
                    )}
                    <p className="text-[10px] mt-1" style={{ color: 'var(--text-disabled)' }}>
                      {new Date(op.operation_date + 'T00:00:00').toLocaleDateString('ru-RU', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
