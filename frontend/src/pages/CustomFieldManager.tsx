import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import {
  ArrowLeft, Plus, Trash2, Save,
  CheckCircle2, AlertCircle, X, Loader2,
  Hash, DollarSign, Type,
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

const FIELD_TYPES = [
  { value: 'text', label: 'Текст', icon: Type },
  { value: 'number', label: 'Число', icon: Hash },
  { value: 'money', label: 'Деньги', icon: DollarSign },
];

export default function CustomFieldManager() {
  const { scId } = useParams<{ scId: string }>();
  const navigate = useNavigate();
  const [fields, setFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('text');
  const [formRequired, setFormRequired] = useState(false);
  const [formCarryOver, setFormCarryOver] = useState(false);

  const scIdNum = Number(scId);

  const load = async () => {
    if (!scId) return;
    setLoading(true);
    try {
      const data = await api.customFields.list(scIdNum);
      setFields(data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [scId]);

  const resetForm = () => {
    setShowForm(false);
    setEditId(null);
    setFormName('');
    setFormType('text');
    setFormRequired(false);
    setFormCarryOver(false);
  };

  const openEdit = (field: any) => {
    setEditId(field.id);
    setFormName(field.name);
    setFormType(field.field_type);
    setFormRequired(field.required);
    setFormCarryOver(field.carry_over);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      setMessage({ ok: false, text: 'Введите название поля' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      if (editId) {
        await api.customFields.update(scIdNum, editId, {
          name: formName,
          field_type: formType,
          required: formRequired,
          carry_over: formCarryOver,
        });
      } else {
        await api.customFields.create(scIdNum, {
          name: formName,
          field_type: formType,
          required: formRequired,
          carry_over: formCarryOver,
        });
      }
      setMessage({ ok: true, text: 'Сохранено' });
      resetForm();
      load();
    } catch (err: any) {
      setMessage({ ok: false, text: err.message });
    }
    setSaving(false);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.customFields.delete(scIdNum, id);
      setFields(prev => prev.filter(f => f.id !== id));
    } catch (err: any) {
      setMessage({ ok: false, text: err.message });
    }
  };

  const moveField = async (id: number, dir: number) => {
    const idx = fields.findIndex(f => f.id === id);
    if (idx === -1 || (dir < 0 && idx === 0) || (dir > 0 && idx === fields.length - 1)) return;
    const next = [...fields];
    [next[idx], next[idx + dir]] = [next[idx + dir], next[idx]];
    setFields(next);
    try {
      await api.customFields.update(scIdNum, id, { sort_order: idx + dir });
      await api.customFields.update(scIdNum, next[idx + dir].id, { sort_order: idx });
    } catch {}
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ArrowLeft size={18} className="text-gray-500" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Поля закрытия смены</h1>
          <p className="text-xs text-gray-400">Настройка дополнительных полей при закрытии смены</p>
        </div>
      </div>

      {/* Info card */}
      <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4">
        <p className="text-xs text-amber-800">
          Поля будут отображаться у сотрудников при закрытии смены. 
          Поля с переносом будут автоматически заполняться значениями из предыдущей смены.
        </p>
      </div>

      {fields.length === 0 && !showForm && (
        <div className="text-center py-8">
          <Type size={32} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-400 mb-4">Нет дополнительных полей</p>
          <button onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700">
            <Plus size={16} />
            Добавить поле
          </button>
        </div>
      )}

      {fields.length > 0 && (
        <div className="space-y-2">
          {fields.map((field, idx) => (
            <div key={field.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="flex flex-col gap-0.5 mt-1">
                    <button onClick={() => moveField(field.id, -1)} disabled={idx === 0}
                      className="text-gray-300 hover:text-gray-500 disabled:opacity-20 p-0.5">
                      <svg width="10" height="6" viewBox="0 0 10 6" fill="currentColor"><path d="M5 0L10 6H0z"/></svg>
                    </button>
                    <button onClick={() => moveField(field.id, 1)} disabled={idx === fields.length - 1}
                      className="text-gray-300 hover:text-gray-500 disabled:opacity-20 p-0.5">
                      <svg width="10" height="6" viewBox="0 0 10 6" fill="currentColor"><path d="M5 6L0 0h10z"/></svg>
                    </button>
                  </div>
                  <div className="p-2 rounded-xl bg-gray-50 shrink-0">
                    {field.field_type === 'money' ? <DollarSign size={16} className="text-emerald-500" />
                      : field.field_type === 'number' ? <Hash size={16} className="text-blue-500" />
                      : <Type size={16} className="text-indigo-500" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{field.name}</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                        {FIELD_TYPES.find(t => t.value === field.field_type)?.label || field.field_type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {field.required && (
                        <span className="text-[10px] text-red-500 font-medium">Обязательное</span>
                      )}
                      {field.carry_over && (
                        <span className="text-[10px] text-indigo-500 font-medium">Перенос</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(field)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.85 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                  </button>
                  <button onClick={() => handleDelete(field.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {fields.length > 0 && !showForm && (
        <button onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors">
          <Plus size={16} />
          Добавить поле
        </button>
      )}

      {/* Add/Edit form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              {editId ? 'Редактировать поле' : 'Новое поле'}
            </h3>
            <button onClick={resetForm} className="p-1 rounded-lg text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Название</label>
            <input type="text" value={formName} onChange={e => setFormName(e.target.value)}
              placeholder="Например: Касса на начало дня"
              className="w-full px-3 py-2 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Тип поля</label>
            <div className="grid grid-cols-3 gap-2">
              {FIELD_TYPES.map(ft => {
                const Icon = ft.icon;
                const active = formType === ft.value;
                return (
                  <button key={ft.value} onClick={() => setFormType(ft.value)}
                    className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl text-xs font-medium transition-all ${
                      active ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-300' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                    }`}>
                    <Icon size={14} />
                    {ft.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={formRequired}
                onChange={e => setFormRequired(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
              <span className="text-xs text-gray-600">Обязательное</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={formCarryOver}
                onChange={e => setFormCarryOver(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
              <span className="text-xs text-gray-600">Перенос из прошлой смены</span>
            </label>
          </div>
          <button onClick={handleSave} disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {editId ? 'Сохранить' : 'Добавить'}
          </button>
        </div>
      )}

      {message && (
        <div className={`flex items-center gap-2 text-xs p-3 rounded-xl ${
          message.ok ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
        }`}>
          {message.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          {message.text}
        </div>
      )}
    </div>
  );
}
