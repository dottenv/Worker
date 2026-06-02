import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useSocketEvent } from '../contexts/SocketContext';
import {
  Wallet, Plus, X, Filter, Search, Trash2,
  ArrowUpCircle, ArrowDownCircle, User as UserIcon, List,
  Users, TrendingUp, Calendar,
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import AnimatedCounter from '../components/AnimatedCounter';

interface Employee {
  id: number; full_name: string; email: string;
}

interface FinanceOp {
  id: number; user_id: number; type: string; amount: number;
  description: string; details: { name: string; price: number }[];
  operation_date: string; created_at: string;
}

interface EmpBalance {
  user_id: number; full_name: string; balance: number;
}

const TYPE_LABELS: Record<string, string> = {
  advance: 'Аванс', salary: 'Зарплата', deduction: 'Удержание',
  payment: 'Выплата', adjustment: 'Корректировка',
};

const CREDIT_TYPES = ['salary', 'adjustment'];

export default function FinanceAdmin() {
  useAuth();
  const [operations, setOperations] = useState<FinanceOp[]>([]);
  const [balance, setBalance] = useState(0);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empBalances, setEmpBalances] = useState<EmpBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
  const [typeFilter, setTypeFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const [formUserId, setFormUserId] = useState<number | ''>('');
  const [formType, setFormType] = useState('advance');
  const [formAmount, setFormAmount] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formDetails, setFormDetails] = useState<{ name: string; price: string }[]>([{ name: '', price: '' }]);
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const fetchOps = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedUserId) params.set('user_id', String(selectedUserId));
      if (typeFilter) params.set('type', typeFilter);
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
      const q = params.toString();
      const res = await api.get(`/finance/admin${q ? '?' + q : ''}`);
      setOperations(res.operations);
      setBalance(res.balance);
    } catch {}
    finally { setLoading(false); }
  }, [selectedUserId, typeFilter, fromDate, toDate]);

  const fetchEmpBalances = useCallback(async () => {
    try {
      const res = await api.get('/finance/admin');
      const ops: FinanceOp[] = res.operations;
      const groups: Record<number, { full_name: string; amount: number }> = {};
      for (const op of ops) {
        if (!groups[op.user_id]) {
          const emp = employees.find(e => e.id === op.user_id);
          groups[op.user_id] = { full_name: emp?.full_name || '—', amount: 0 };
        }
        if (CREDIT_TYPES.includes(op.type)) {
          groups[op.user_id].amount += op.amount;
        } else {
          groups[op.user_id].amount -= op.amount;
        }
      }
      setEmpBalances(Object.entries(groups).map(([uid, g]) => ({
        user_id: Number(uid), full_name: g.full_name, balance: Math.round(g.amount * 100) / 100,
      })));
    } catch {}
  }, [employees]);

  useEffect(() => {
    api.get('/finance/employees').then(emps => {
      setEmployees(emps);
      fetchOps();
    }).catch(() => {});
  }, []);

  useEffect(() => { fetchOps(); }, [selectedUserId]);
  useEffect(() => { if (employees.length) fetchEmpBalances(); }, [operations, employees]);

  useSocketEvent('finance:updated', () => { fetchOps(); });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUserId || !formAmount) return;
    setSaving(true);
    try {
      const details = formDetails.filter(d => d.name && d.price);
      await api.post('/finance', {
        user_id: Number(formUserId),
        type: formType,
        amount: formAmount,
        description: formDesc,
        details: details.map(d => ({ name: d.name, price: Number(d.price) })),
        operation_date: formDate,
      });
      setShowAdd(false);
      setFormType('advance');
      setFormAmount('');
      setFormDesc('');
      setFormDetails([{ name: '', price: '' }]);
      setFormDate(new Date().toISOString().slice(0, 10));
      api.invalidate('/finance');
      await fetchOps();
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить операцию?')) return;
    try {
      await api.del(`/finance/${id}`);
      api.invalidate('/finance');
      await fetchOps();
    } catch {}
  };

  const selectedEmployee = employees.find(e => e.id === Number(selectedUserId));
  const totalBalance = empBalances.reduce((s, e) => s + e.balance, 0);

  const addDetailRow = () => setFormDetails(prev => [...prev, { name: '', price: '' }]);
  const removeDetailRow = (i: number) => setFormDetails(prev => prev.filter((_, idx) => idx !== i));
  const updateDetail = (i: number, key: 'name' | 'price', val: string) => {
    setFormDetails(prev => prev.map((d, idx) => idx === i ? { ...d, [key]: val } : d));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Управление финансами</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Сотрудники: {employees.length}</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl transition-colors"
          style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
          <Plus size={16} /> Добавить
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--accent-bg)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-1.5 mb-1">
            <Users size={14} className="text-indigo-500" />
            <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>Сотрудников</span>
          </div>
          <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{employees.length}</p>
        </div>
        <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--accent-bg)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-1.5 mb-1">
            <Wallet size={14} className="text-emerald-500" />
            <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>Баланс</span>
          </div>
          <p className="text-lg font-bold text-emerald-600">
            <AnimatedCounter value={totalBalance} />
          </p>
        </div>
        <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--accent-bg)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp size={14} className="text-amber-500" />
            <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>Операций</span>
          </div>
          <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{operations.length}</p>
        </div>
      </div>

      {/* Employee chips */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Users size={14} className="text-indigo-400" />
          <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Сотрудники</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setSelectedUserId('')}
            className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
              selectedUserId === '' ? 'bg-indigo-100 text-indigo-700' : ''
            }`}
            style={selectedUserId !== '' ? { color: 'var(--text-secondary)', backgroundColor: 'var(--bg-tertiary)' } : {}}>
            Все
          </button>
          {employees.map(emp => {
            const eb = empBalances.find(e => e.user_id === emp.id);
            const isSelected = selectedUserId === emp.id;
            return (
              <button key={emp.id} onClick={() => setSelectedUserId(isSelected ? '' : emp.id)}
                className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                  isSelected ? 'bg-indigo-100 text-indigo-700' : ''
                }`}
                style={isSelected ? {} : { color: 'var(--text-secondary)', backgroundColor: 'var(--bg-tertiary)' }}>
                {emp.full_name}
                {eb !== undefined && (
                  <span className={`text-[10px] ${eb.balance >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                    {eb.balance >= 0 ? '+' : ''}{eb.balance.toLocaleString('ru-RU', { minimumFractionDigits: 0 })}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedUserId && selectedEmployee && (
        <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--accent-bg)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--accent)' }}>
              <Wallet size={22} className="text-white" />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Баланс: {selectedEmployee.full_name}
              </p>
              <p className="text-2xl font-bold" style={{ color: balance >= 0 ? 'var(--text-primary)' : 'var(--error)' }}>
                <AnimatedCounter value={balance} />
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5 flex-wrap">
          {['', 'advance', 'salary', 'deduction', 'payment', 'adjustment'].map(t => (
            <button key={t} onClick={() => { setTypeFilter(t); }}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                typeFilter === t
                  ? 'bg-indigo-100 text-indigo-700'
                  : ''}`}
              style={typeFilter === t ? {} : { color: 'var(--text-secondary)', backgroundColor: 'var(--bg-tertiary)' }}>
              {t === '' ? 'Все' : (TYPE_LABELS[t] || t)}
            </button>
          ))}
        </div>
        <button onClick={() => setShowFilters(!showFilters)}
          className="p-2 rounded-lg shrink-0 transition-colors"
          style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-tertiary)' }}>
          <Filter size={16} />
        </button>
      </div>

      {showFilters && (
        <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>От</label>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>До</label>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
            </div>
          </div>
          <button onClick={fetchOps}
            className="flex items-center justify-center gap-1.5 w-full text-sm font-medium py-2 rounded-lg transition-colors"
            style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
            <Search size={14} /> Применить
          </button>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="w-full max-w-md rounded-2xl p-5 space-y-4" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Новая операция</h3>
              <button onClick={() => setShowAdd(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X size={18} style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-3">
              <select value={formUserId} onChange={e => setFormUserId(Number(e.target.value))} required
                className="w-full px-3.5 py-3 rounded-xl text-sm"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                <option value="">Выберите сотрудника</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                ))}
              </select>
              <select value={formType} onChange={e => setFormType(e.target.value)}
                className="w-full px-3.5 py-3 rounded-xl text-sm"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                {Object.entries(TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <input type="number" step="0.01" value={formAmount} onChange={e => setFormAmount(e.target.value)}
                placeholder="Сумма" required
                className="w-full px-3.5 py-3 rounded-xl text-sm"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
              <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)}
                className="w-full px-3.5 py-3 rounded-xl text-sm"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
              <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)}
                placeholder="Описание (необязательно)" rows={2}
                className="w-full px-3.5 py-3 rounded-xl text-sm resize-none"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />

              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  <List size={12} /> Детализация
                </label>
                {formDetails.map((d, i) => (
                  <div key={i} className="flex items-center gap-1.5 mb-1.5">
                    <input type="text" value={d.name} onChange={e => updateDetail(i, 'name', e.target.value)}
                      placeholder="Наименование" className="flex-1 px-3 py-2 rounded-lg text-sm"
                      style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
                    <input type="number" step="0.01" value={d.price} onChange={e => updateDetail(i, 'price', e.target.value)}
                      placeholder="Цена" className="w-24 px-3 py-2 rounded-lg text-sm"
                      style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
                    {formDetails.length > 1 && (
                      <button type="button" onClick={() => removeDetailRow(i)} className="p-1.5 rounded-lg"
                        style={{ color: 'var(--error)' }}>
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addDetailRow}
                  className="text-xs font-medium flex items-center gap-1 py-1.5"
                  style={{ color: 'var(--accent)' }}>
                  + Добавить строку
                </button>
              </div>

              <button type="submit" disabled={saving}
                className="flex items-center justify-center gap-2 w-full text-sm font-medium py-3 rounded-xl transition-colors"
                style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
                {saving ? 'Сохранение...' : 'Добавить'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Operations list */}
      {loading ? <LoadingSpinner /> : operations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <Wallet size={40} style={{ color: 'var(--text-disabled)' }} />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Нет операций</p>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={14} className="text-indigo-400" />
            <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Операции ({operations.length})
            </span>
          </div>
          <div className="space-y-1">
            {operations.map(op => {
              const isCredit = CREDIT_TYPES.includes(op.type);
              const emp = employees.find(e => e.id === op.user_id);
              return (
                <div key={op.id} className="rounded-xl p-4 transition-colors relative group"
                  style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg shrink-0 ${isCredit ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                      {isCredit ? <ArrowUpCircle size={18} /> : <ArrowDownCircle size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {TYPE_LABELS[op.type] || op.type}
                          </p>
                          {!selectedUserId && emp && (
                            <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                              <UserIcon size={10} /> {emp.full_name}
                            </p>
                          )}
                        </div>
                        <p className={`text-sm font-bold shrink-0 ml-2 ${isCredit ? 'text-emerald-600' : 'text-red-500'}`}>
                          {isCredit ? '+' : '-'}{op.amount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
                        </p>
                      </div>
                      {op.description && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{op.description}</p>
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
                    <button onClick={() => handleDelete(op.id)}
                      className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: 'var(--error)' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}