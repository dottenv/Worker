import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import {
  Clock,
  Building2,
  Save,
  Coffee,
  FileText,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface Center {
  id: number;
  name: string;
  address?: string;
}

export default function TimeTracker() {
  const [searchParams] = useSearchParams();
  const preselectedCenter = searchParams.get('center');

  const [centers, setCenters] = useState<Center[]>([]);
  const [selectedCenter, setSelectedCenter] = useState(preselectedCenter || '');
  const [clockIn, setClockIn] = useState('');
  const [clockOut, setClockOut] = useState('');
  const [breakMinutes, setBreakMinutes] = useState(0);
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.serviceCenters.list().then(setCenters).catch(console.error);
  }, []);

  useEffect(() => {
    if (preselectedCenter) setSelectedCenter(preselectedCenter);
  }, [preselectedCenter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setIsSuccess(false);
    if (!selectedCenter || !clockIn) {
      setMessage('Выберите центр и укажите время начала');
      return;
    }
    setSaving(true);
    try {
      await api.timeEntries.create(Number(selectedCenter), {
        clock_in: new Date(clockIn).toISOString(),
        clock_out: clockOut ? new Date(clockOut).toISOString() : undefined,
        break_minutes: breakMinutes,
        notes,
      });
      setIsSuccess(true);
      setMessage('Запись добавлена!');
      setClockIn('');
      setClockOut('');
      setBreakMinutes(0);
      setNotes('');
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  };

  const setNow = (field: 'in' | 'out') => {
    const now = new Date();
    const iso = now.toISOString().slice(0, 16);
    if (field === 'in') setClockIn(iso);
    else setClockOut(iso);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Учёт времени</h1>
        <p className="text-sm text-gray-400">Добавьте запись о работе</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4"
      >
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
            <Building2 size={14} />
            Склад
          </label>
          <select
            value={selectedCenter}
            onChange={(e) => setSelectedCenter(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            required
          >
            <option value="">Выберите центр</option>
            {centers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.address ? `${c.name} (${c.address})` : c.name}
            </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
              <Clock size={14} />
              Начало
            </label>
            <div className="flex gap-1.5">
              <input
                type="datetime-local"
                value={clockIn}
                onChange={(e) => setClockIn(e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                required
              />
              <button
                type="button"
                onClick={() => setNow('in')}
                className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-medium hover:bg-indigo-100 transition-colors whitespace-nowrap"
              >
                Сейчас
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
              <Clock size={14} />
              Конец
            </label>
            <div className="flex gap-1.5">
              <input
                type="datetime-local"
                value={clockOut}
                onChange={(e) => setClockOut(e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
              <button
                type="button"
                onClick={() => setNow('out')}
                className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-medium hover:bg-indigo-100 transition-colors whitespace-nowrap"
              >
                Сейчас
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
            <Coffee size={14} />
            Перерыв (минуты)
          </label>
          <input
            type="number"
            min={0}
            value={breakMinutes}
            onChange={(e) => setBreakMinutes(Number(e.target.value))}
            className="w-full px-3.5 py-2.5 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
        </div>

        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
            <FileText size={14} />
            Заметки
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none"
            rows={2}
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center justify-center gap-2 w-full bg-indigo-600 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          <Save size={16} />
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>

        {message && (
          <div
            className={`flex items-center gap-2 text-sm p-3 rounded-xl ${
              isSuccess
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-red-50 text-red-600'
            }`}
          >
            {isSuccess ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {message}
          </div>
        )}
      </form>
    </div>
  );
}
