import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import {
  ArrowLeft,
  Plus,
  X,
  Save,
  Trash2,
  Clock,
  DollarSign,
  Palette,
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

export default function ShiftManager() {
  const { scId } = useParams<{ scId: string }>();
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [isPaid, setIsPaid] = useState(true);
  const [color, setColor] = useState('#6366f1');

  const load = () => {
    if (!scId) return;
    setLoading(true);
    api.shifts
      .list(Number(scId))
      .then(setShifts)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [scId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scId) return;
    setSaving(true);
    try {
      await api.shifts.create(Number(scId), {
        name,
        start_time: startTime,
        end_time: endTime,
        is_paid: isPaid,
        color,
      });
      setName('');
      setStartTime('09:00');
      setEndTime('18:00');
      setIsPaid(true);
      setColor('#6366f1');
      setShowForm(false);
      load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (shiftId: number) => {
    if (!scId) return;
    if (!confirm('Удалить смену?')) return;
    try {
      await api.shifts.delete(Number(scId), shiftId);
      load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleTogglePaid = async (shift: any) => {
    if (!scId) return;
    try {
      await api.shifts.update(Number(scId), shift.id, { is_paid: !shift.is_paid });
      load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-5">
      <div>
        <Link
          to={`/centers/${scId}`}
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-indigo-600 transition-colors mb-2"
        >
          <ArrowLeft size={14} />
          Назад к центру
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Смены</h1>
        <p className="text-sm text-gray-400">Управление шаблонами смен</p>
      </div>

      <button
        onClick={() => setShowForm(!showForm)}
        className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border-2 border-dashed border-gray-200 text-sm font-medium text-gray-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all"
      >
        {showForm ? <X size={18} /> : <Plus size={18} />}
        {showForm ? 'Закрыть' : 'Добавить смену'}
      </button>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Название смены
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: Дневная смена"
              className="w-full px-3.5 py-2.5 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                <Clock size={14} />
                Начало
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                required
              />
            </div>
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                <Clock size={14} />
                Конец
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                required
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPaid}
                onChange={(e) => setIsPaid(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="flex items-center gap-1 text-sm text-gray-700">
                <DollarSign size={14} />
                Оплачиваемая
              </span>
            </label>
            <div className="flex items-center gap-2 ml-auto">
              <Palette size={14} className="text-gray-400" />
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-8 h-8 rounded-lg border-0 cursor-pointer"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center justify-center gap-2 w-full bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <Save size={16} />
            {saving ? 'Сохранение...' : 'Создать смену'}
          </button>
        </form>
      )}

      {shifts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
          <div className="p-3 rounded-xl bg-gray-50 inline-flex mb-3">
            <Clock size={24} className="text-gray-300" />
          </div>
          <p className="text-sm text-gray-400">Нет созданных смен</p>
        </div>
      ) : (
        <div className="space-y-2">
          {shifts.map((s) => (
            <div
              key={s.id}
              className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center gap-4"
            >
              <div
                className="w-3 h-12 rounded-full shrink-0"
                style={{ backgroundColor: s.color }}
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-gray-900">{s.name}</h3>
                <p className="text-xs text-gray-400">
                  {s.start_time} – {s.end_time}
                </p>
                <span className={`inline-flex items-center gap-1 text-xs font-medium mt-1 px-2 py-0.5 rounded-full ${
                  s.is_paid ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-400'
                }`}>
                  <DollarSign size={10} />
                  {s.is_paid ? 'Оплачиваемая' : 'Без оклада'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleTogglePaid(s)}
                  className={`p-2 rounded-xl text-xs font-medium transition-colors ${
                    s.is_paid
                      ? 'text-amber-500 hover:bg-amber-50'
                      : 'text-emerald-500 hover:bg-emerald-50'
                  }`}
                  title={s.is_paid ? 'Сделать без оклада' : 'Сделать оплачиваемой'}
                >
                  <DollarSign size={14} />
                </button>
                <button
                  onClick={() => handleDelete(s.id)}
                  className="p-2 rounded-xl text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
