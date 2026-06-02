import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle2, XCircle, Clock, ArrowLeft, Loader2, Save, X } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

export default function TimeRequests() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  const [approving, setApproving] = useState<any>(null);
  const [shifts, setShifts] = useState<any[]>([]);
  const [aType, setAType] = useState('full_day');
  const [aStart, setAStart] = useState('09:00');
  const [aEnd, setAEnd] = useState('18:00');
  const [aRate, setARate] = useState(0);
  const [aShiftId, setAShiftId] = useState('');

  const load = async () => {
    try {
      const data = await api.timeEntries.pending();
      setRequests(data);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!approving) return;
    api.shifts.list(approving.service_center_id).then(setShifts).catch(() => setShifts([]));
  }, [approving]);

  const handleReject = async (id: number) => {
    setProcessing(id);
    try {
      await api.timeEntries.reject(id);
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch {}
    setProcessing(null);
  };

  const handleApproveWithDetails = async () => {
    if (!approving) return;
    setProcessing(approving.id);
    try {
      await api.timeEntries.approve(approving.id, {
        type: aType,
        start_time: aType === 'hourly' ? aStart : undefined,
        end_time: aType === 'hourly' ? aEnd : undefined,
        hourly_rate: aRate || undefined,
        shift_id: aShiftId ? Number(aShiftId) : undefined,
      });
      setRequests(prev => prev.filter(r => r.id !== approving.id));
      setApproving(null);
    } catch {}
    setProcessing(null);
  };

  const openApprove = (r: any) => {
    setApproving(r);
    setAType('full_day');
    setAStart('09:00');
    setAEnd('18:00');
    setARate(r.hourly_rate || 0);
    setAShiftId('');
  };

  if (!user) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ArrowLeft size={18} className="text-gray-500" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Запросы на выход</h1>
          <p className="text-xs text-gray-400">Подтверждение смен без графика</p>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : requests.length === 0 ? (
        <div className="text-center py-16">
          <Clock size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-400">Нет активных запросов</p>
        </div>
      ) : (
        <div className="space-y-2">
          {requests.map(r => (
            <div key={r.id}
              className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center">
                    <Clock size={16} className="text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{r.user_name}</p>
                    <p className="text-xs text-gray-400">{r.service_center_address ? `${r.service_center_name} (${r.service_center_address})` : r.service_center_name}</p>
                  </div>
                </div>
                <span className="text-[10px] text-gray-400">
                  {new Date(r.clock_in).toLocaleString('ru', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openApprove(r)}
                  disabled={processing === r.id}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-medium hover:bg-emerald-100 transition-colors disabled:opacity-50">
                  {processing === r.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  Подтвердить
                </button>
                <button onClick={() => handleReject(r.id)}
                  disabled={processing === r.id}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-50 text-red-500 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50">
                  <XCircle size={14} />
                  Отклонить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approve modal */}
      {approving && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-20 p-5 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl space-y-4 animate-slide-up">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Настройки смены</h3>
              <button onClick={() => setApproving(null)} className="p-1 rounded-lg text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-gray-400">
              Создать смену для <strong>{approving.user_name}</strong>
            </p>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Тип</label>
              <select value={aType} onChange={e => setAType(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40">
                <option value="full_day">Весь день</option>
                <option value="hourly">По часам</option>
              </select>
            </div>
            {aType === 'hourly' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Начало</label>
                  <input type="time" value={aStart} onChange={e => setAStart(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Конец</label>
                  <input type="time" value={aEnd} onChange={e => setAEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
                </div>
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Ставка (₽/ч)</label>
              <input type="number" min={0} value={aRate} onChange={e => setARate(Number(e.target.value))}
                className="w-full px-3 py-2 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
            </div>
            {shifts.length > 0 && (
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Шаблон смены</label>
                <select value={aShiftId} onChange={e => setAShiftId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40">
                  <option value="">Без шаблона</option>
                  {shifts.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.start_time}–{s.end_time})</option>
                  ))}
                </select>
              </div>
            )}
            <button onClick={handleApproveWithDetails} disabled={processing === approving.id}
              className="flex items-center justify-center gap-2 w-full bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {processing === approving.id ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {processing === approving.id ? 'Сохранение...' : 'Подтвердить и создать смену'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
