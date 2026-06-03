import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, formatLocal } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useCenters } from '../contexts/CenterContext';
import {
  Plus,
  X,
  Save,
  Calendar,
  Clock,
  User,
  Building2,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Zap,
  ChevronLeft,
  ChevronRight,
  ArrowRightLeft,
  Copy,
  Loader2,
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import ScheduleDetailModal from '../components/ScheduleDetailModal';
import AdminHistoryWidget from '../components/AdminHistoryWidget';

const PATTERNS = [
  { label: '2/2', work: 2, rest: 2 },
  { label: '3/3', work: 3, rest: 3 },
  { label: '1/3', work: 1, rest: 3 },
  { label: '2/1', work: 2, rest: 1 },
  { label: '5/2', work: 5, rest: 2 },
  { label: '1/2', work: 1, rest: 2 },
  { label: '3/1', work: 3, rest: 1 },
];
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const STORAGE_VIEW_KEY = 'adminScheduleViewMode';
type ViewMode = 'week' | 'month';

function generateDates(workDays: number, restDays: number, start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(start);
  const endD = new Date(end);
  let work = true;
  let step = 0;
  while (cur <= endD) {
    if (work) dates.push(formatLocal(cur));
    step++;
    if (work && step >= workDays) { work = false; step = 0; }
    if (!work && step >= restDays) { work = true; step = 0; }
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

export default function AdminSchedule() {
  const navigate = useNavigate();
  const { centers, activeCenterId, setActiveCenterId } = useCenters();
  const [members, setMembers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [mode, setMode] = useState<'single' | 'quick'>('single');
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    (localStorage.getItem(STORAGE_VIEW_KEY) as ViewMode) || 'week'
  );
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);

  const [scId, setScId] = useState('');
  const [userId, setUserId] = useState('');

  const [shifts, setShifts] = useState<any[]>([]);
  const [sShiftId, setSShiftId] = useState('');
  const [qShiftId, setQShiftId] = useState('');

  const [sDate, setSDate] = useState(formatLocal(new Date()));
  const [sType, setSType] = useState<'full_day' | 'hourly'>('full_day');
  const [sStart, setSStart] = useState('09:00');
  const [sEnd, setSEnd] = useState('18:00');
  const [sRate, setSRate] = useState(0);
  const [sNotes, setSNotes] = useState('');

  const [patternIdx, setPatternIdx] = useState(0);
  const [customWork, setCustomWork] = useState(2);
  const [customRest, setCustomRest] = useState(2);
  const [customPattern, setCustomPattern] = useState(false);
  const [qStart, setQStart] = useState(formatLocal(new Date()));
  const [qEnd, setQEnd] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() + 1);
    return formatLocal(d);
  });
  const [qType, setQType] = useState<'full_day' | 'hourly'>('full_day');
  const [qStartTime, setQStartTime] = useState('09:00');
  const [qEndTime, setQEndTime] = useState('18:00');
  const [qRate, setQRate] = useState(0);
  const [preview, setPreview] = useState<string[]>([]);
  const { user } = useAuth();
  const financeEnabled = !!user?.finance_enabled;
  const [detailEntry, setDetailEntry] = useState<any>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showCopy, setShowCopy] = useState(false);
  const [copySrcOffset, setCopySrcOffset] = useState(-1);
  const [copyTgtOffset, setCopyTgtOffset] = useState(0);
  const [copyLoading, setCopyLoading] = useState(false);
  const [copyMessage, setCopyMessage] = useState('');

  const today = new Date();
  const todayStr = formatLocal(today);

  const weekMonday = new Date(today);
  weekMonday.setDate(today.getDate() - today.getDay() + 1 + weekOffset * 7);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekMonday); d.setDate(weekMonday.getDate() + i);
    return formatLocal(d);
  });

  const monthDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const monthLabel = monthDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const monthDays: string[] = [];
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(monthDate.getFullYear(), monthDate.getMonth(), i);
    monthDays.push(formatLocal(d));
  }
  const days = viewMode === 'week' ? weekDays : monthDays;

  const loadData = async () => {
    setLoading(true);
    try {
      let from: string, to: string;
      if (viewMode === 'week') {
        from = weekDays[0]; to = weekDays[6];
      } else {
        const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
        const last = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
        from = formatLocal(first);
        to = formatLocal(last);
      }

      const raw: any[] = await api.schedule.admin({ from, to, service_center_id: activeCenterId || undefined });
      setEmployees(raw);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [viewMode, weekOffset, monthOffset, activeCenterId]);

  const loadMembersBySc = async (id: string) => {
    if (!id) { setMembers([]); return; }
    try { const ms = await api.members.list(Number(id)); setMembers(ms); }
    catch { setMembers([]); }
  };

  const handleScChange = async (id: string) => {
    setScId(id); setUserId(''); loadMembersBySc(id);
    if (id) {
      try { const s = await api.shifts.list(Number(id)); setShifts(s); }
      catch { setShifts([]); }
    } else {
      setShifts([]);
    }
  };

  const applyShiftToSingle = (shiftId: string) => {
    setSShiftId(shiftId);
    const shift = shifts.find(s => s.id === Number(shiftId));
    if (shift) {
      setSType('hourly');
      setSStart(shift.start_time);
      setSEnd(shift.end_time);
    }
  };

  const applyShiftToQuick = (shiftId: string) => {
    setQShiftId(shiftId);
    const shift = shifts.find(s => s.id === Number(shiftId));
    if (shift) {
      setQType('hourly');
      setQStartTime(shift.start_time);
      setQEndTime(shift.end_time);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scId || !userId || !sDate) {
      setMessage('Заполните все поля'); setIsSuccess(false); return;
    }
    setSaving(true); setMessage('');
    try {
      await api.schedule.create({
        user_id: Number(userId), service_center_id: Number(scId),
        date: sDate, type: sType,
        start_time: sType === 'hourly' ? sStart : undefined,
        end_time: sType === 'hourly' ? sEnd : undefined,
        ...(financeEnabled ? { hourly_rate: sRate } : {}),
        notes: sNotes,
        ...(sShiftId ? { shift_id: Number(sShiftId) } : {}),
      });
      setIsSuccess(true); setMessage('Смена добавлена!');
      setSDate(todayStr); setSType('full_day'); setSStart('09:00'); setSEnd('18:00');
      setSRate(0); setSNotes(''); setSShiftId('');
      loadData();
    } catch (err: any) { setIsSuccess(false); setMessage(err.message); }
    finally { setSaving(false); }
  };

  useEffect(() => {
    const p = customPattern ? { work: customWork, rest: customRest } : PATTERNS[patternIdx];
    setPreview(generateDates(p.work, p.rest, qStart, qEnd));
  }, [patternIdx, customWork, customRest, customPattern, qStart, qEnd]);

  const handleQuickFill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scId || !userId || preview.length === 0) {
      setMessage('Выберите центр, сотрудника и проверьте даты'); setIsSuccess(false); return;
    }
    setSaving(true); setMessage(''); let ok = 0; let err = 0;
    for (const date of preview) {
      try {
        await api.schedule.create({
          user_id: Number(userId), service_center_id: Number(scId),
          date, type: qType,
          start_time: qType === 'hourly' ? qStartTime : undefined,
          end_time: qType === 'hourly' ? qEndTime : undefined,
          hourly_rate: qRate,
          ...(qShiftId ? { shift_id: Number(qShiftId) } : {}),
        });
        ok++;
      } catch { err++; }
    }
    setIsSuccess(err === 0);
    setMessage(err === 0 ? `Добавлено ${ok} смен` : `Добавлено ${ok}, ошибок ${err}`);
    setSaving(false); loadData();
  };

  const handleDelete = async (entryId: number) => {
    if (!confirm('Удалить смену?')) return;
    try { await api.schedule.delete(entryId); loadData(); }
    catch (err: any) { alert(err.message); }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Удалить ${selectedIds.size} смен?`)) return;
    try {
      await api.post('/schedule/bulk-delete', { ids: Array.from(selectedIds) });
      setSelectedIds(new Set());
      setSelectMode(false);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopy = async () => {
    if (!activeCenterId) { setCopyMessage('Выберите склад'); return; }
    setCopyLoading(true); setCopyMessage('');
    try {
      const monday = (offset: number) => {
        const d = new Date();
        d.setDate(d.getDate() - d.getDay() + 1 + offset * 7);
        return formatLocal(d);
      };
      const sunday = (offset: number) => {
        const d = new Date();
        d.setDate(d.getDate() - d.getDay() + 1 + offset * 7 + 6);
        return formatLocal(d);
      };
      const res = await api.schedule.copy({
        source_from: monday(copySrcOffset),
        source_to: sunday(copySrcOffset),
        target_from: monday(copyTgtOffset),
        target_to: sunday(copyTgtOffset),
        service_center_id: activeCenterId,
      });
      setCopyMessage(`Создано: ${res.created}, обновлено: ${res.updated}`);
      setShowCopy(false);
      loadData();
    } catch (err: any) {
      setCopyMessage(err.message);
    }
    setCopyLoading(false);
  };

  if (loading) return <LoadingSpinner />;

  const ownedCenters = centers.filter((c: any) => ['owner', 'admin'].includes(c.role));
  const adminCenterOptions = ownedCenters.length > 0 ? ownedCenters : centers;
  const headerLabel = viewMode === 'week'
    ? `${new Date(weekDays[0]).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} – ${new Date(weekDays[6]).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`
    : monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 shrink-0">
          <h1 className="text-xl font-bold text-gray-900">График работы</h1>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1 shrink-0">
          <button
            onClick={() => navigate('/swaps')}
            className="flex items-center justify-center gap-1.5 bg-white border border-gray-200 text-gray-600 px-2 sm:px-3 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm shrink-0"
            title="Обмен сменами"
          >
            <ArrowRightLeft size={16} />
            <span className="hidden sm:inline">Обмен</span>
          </button>
          <button
            onClick={() => { setShowCopy(!showCopy); if (showCopy) setCopyMessage(''); }}
            className="flex items-center justify-center gap-1.5 bg-white border border-gray-200 text-gray-600 px-2 sm:px-3 py-2 rounded-xl text-sm font-medium hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 transition-colors shadow-sm shrink-0"
            title="Копировать смены"
          >
            <Copy size={16} />
            <span className="hidden sm:inline">Копировать</span>
          </button>
          <button
            onClick={() => { setSelectMode(!selectMode); setSelectedIds(new Set()); }}
            className={`flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm shrink-0 ${
              selectMode
                ? 'bg-red-50 text-red-600 border border-red-200'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
            title={selectMode ? 'Отменить выбор' : 'Выбрать смены'}
          >
            {selectMode ? <X size={16} /> : <Plus size={16} className="rotate-45" />}
            <span className="hidden sm:inline">{selectMode ? 'Отменить' : 'Выбрать'}</span>
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center justify-center gap-1.5 bg-indigo-600 text-white px-2 sm:px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm shrink-0"
            title={showForm ? 'Закрыть' : 'Добавить смену'}
          >
            {showForm ? <X size={16} /> : <Plus size={16} />}
            <span className="hidden sm:inline">{showForm ? 'Закрыть' : 'Добавить'}</span>
          </button>
        </div>
      </div>

      {showCopy && (
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">Копировать смены</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500">Исходная неделя</label>
              <select value={copySrcOffset} onChange={e => setCopySrcOffset(Number(e.target.value))}
                className="w-full px-3 py-2 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40">
                <option value={-1}>Прошлая</option>
                <option value={0}>Текущая</option>
                <option value={1}>Следующая</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500">Целевая неделя</label>
              <select value={copyTgtOffset} onChange={e => setCopyTgtOffset(Number(e.target.value))}
                className="w-full px-3 py-2 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40">
                <option value={0}>Текущая</option>
                <option value={1}>Следующая</option>
                <option value={2}>Через одну</option>
              </select>
            </div>
          </div>
          <button onClick={handleCopy} disabled={copyLoading || copySrcOffset === copyTgtOffset}
            className="flex items-center justify-center gap-2 w-full bg-amber-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-amber-600 disabled:opacity-40 transition-colors">
            {copyLoading ? <Loader2 size={16} className="animate-spin" /> : <Copy size={16} />}
            {copyLoading ? 'Копирование...' : 'Копировать'}
          </button>
          {copyMessage && (
            <div className={`flex items-center gap-1.5 text-xs ${copyMessage.includes('ошибка') ? 'text-red-500' : 'text-emerald-600'}`}>
              {copyMessage.includes('ошибка') ? <AlertCircle size={12} /> : <CheckCircle2 size={12} />}
              {copyMessage}
            </div>
          )}
        </div>
      )}

      {showForm && (
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex gap-1.5 bg-gray-100 p-1 rounded-2xl">
            <button onClick={() => setMode('single')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-all ${
                mode === 'single' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'
              }`}>
              <Calendar size={15} /> Обычная
            </button>
            <button onClick={() => setMode('quick')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-all ${
                mode === 'quick' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'
              }`}>
              <Zap size={15} /> Быстрое заполнение
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
               <label className="flex items-center gap-1 text-xs font-medium text-gray-500"><Building2 size={12} /> Склад</label>
              <select value={scId} onChange={(e) => handleScChange(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" required>
                <option value="">Выберите</option>
                {ownedCenters.map((c: any) => (<option key={c.id} value={c.id}>{c.address ? `${c.name} (${c.address})` : c.name}</option>))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-1 text-xs font-medium text-gray-500"><User size={12} /> Сотрудник</label>
              <select value={userId} onChange={(e) => setUserId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" required disabled={!scId}>
                <option value="">Выберите</option>
                {members.map((m: any) => (<option key={m.id} value={m.user_id}>{m.user.full_name}</option>))}
              </select>
            </div>
          </div>

          {mode === 'single' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1 text-xs font-medium text-gray-500"><Calendar size={12} /> Дата</label>
                  <input type="date" value={sDate} onChange={(e) => setSDate(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" required />
                </div>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1 text-xs font-medium text-gray-500"><Clock size={12} /> Тип</label>
                  <select value={sType} onChange={(e) => setSType(e.target.value as 'full_day' | 'hourly')}
                    className="w-full px-3 py-2 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40">
                    <option value="full_day">Весь день</option><option value="hourly">По часам</option>
                  </select>
                </div>
              </div>
              {shifts.length > 0 && (
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1 text-xs font-medium text-gray-500">Шаблон смены</label>
                  <div className="relative">
                    <select value={sShiftId} onChange={(e) => applyShiftToSingle(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 appearance-none cursor-pointer">
                      <option value="">Без шаблона</option>
                      {shifts.map((s: any) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.start_time}–{s.end_time})
                        </option>
                      ))}
                    </select>
                    <Clock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              )}
              {sType === 'hourly' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500">Начало</label>
                    <input type="time" value={sStart} onChange={(e) => setSStart(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500">Конец</label>
                    <input type="time" value={sEnd} onChange={(e) => setSEnd(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
                  </div>
                </div>
              )}
                      {financeEnabled ? (
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1 text-xs font-medium text-gray-500">
                    <DollarSign size={12} /> Ставка ({sType === 'full_day' ? '₽/смену' : '₽/ч'})
                  </label>
                  <input type="number" min={0} value={sRate} onChange={(e) => setSRate(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-3 text-sm text-gray-500">
                  Включите модуль «Финансы», чтобы задать ставку для смены.
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500">Заметки</label>
                <input type="text" value={sNotes} onChange={(e) => setSNotes(e.target.value)} placeholder="Комментарий..."
                  className="w-full px-3 py-2 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
              </div>
              <button type="submit" disabled={saving}
                className="flex items-center justify-center gap-2 w-full bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                <Save size={16} /> {saving ? 'Сохранение...' : 'Добавить смену'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleQuickFill} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5">График работы / отдыха</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {PATTERNS.map((p, i) => (
                    <button key={p.label} type="button"
                      onClick={() => { setPatternIdx(i); setCustomPattern(false); }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                        !customPattern && patternIdx === i
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-200'
                      }`}>{p.label}</button>
                  ))}
                  <button type="button" onClick={() => setCustomPattern(true)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                      customPattern ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-200'
                    }`}>Свой</button>
                </div>
                {customPattern && (
                  <div className="flex items-center gap-2">
                    <input type="number" min={1} value={customWork} onChange={(e) => setCustomWork(Math.max(1, Number(e.target.value)))}
                      className="w-16 px-2 py-1.5 bg-gray-50 border-0 rounded-xl text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
                    <span className="text-xs text-gray-400">/</span>
                    <input type="number" min={1} value={customRest} onChange={(e) => setCustomRest(Math.max(1, Number(e.target.value)))}
                      className="w-16 px-2 py-1.5 bg-gray-50 border-0 rounded-xl text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
                    <span className="text-xs text-gray-400">(рабочие / выходные)</span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500">Старт</label>
                  <input type="date" value={qStart} onChange={(e) => setQStart(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500">Конец</label>
                  <input type="date" value={qEnd} onChange={(e) => setQEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1 text-xs font-medium text-gray-500"><Clock size={12} /> Тип</label>
                  <select value={qType} onChange={(e) => setQType(e.target.value as 'full_day' | 'hourly')}
                    className="w-full px-3 py-2 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40">
                    <option value="full_day">Весь день</option><option value="hourly">По часам</option>
                  </select>
                </div>
                {financeEnabled ? (
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1 text-xs font-medium text-gray-500">
                      <DollarSign size={12} /> Ставка ({qType === 'full_day' ? '₽/смену' : '₽/ч'})
                    </label>
                    <input type="number" min={0} value={qRate} onChange={(e) => setQRate(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-3 text-sm text-gray-500">
                    Включите модуль «Финансы», чтобы задать ставку для смен.
                  </div>
                )}
              </div>
              {shifts.length > 0 && (
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1 text-xs font-medium text-gray-500">Шаблон смены</label>
                  <div className="relative">
                    <select value={qShiftId} onChange={(e) => applyShiftToQuick(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 appearance-none cursor-pointer">
                      <option value="">Без шаблона</option>
                      {shifts.map((s: any) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.start_time}–{s.end_time})
                        </option>
                      ))}
                    </select>
                    <Clock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              )}
              {qType === 'hourly' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500">Начало</label>
                    <input type="time" value={qStartTime} onChange={(e) => setQStartTime(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500">Конец</label>
                    <input type="time" value={qEndTime} onChange={(e) => setQEndTime(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
                  </div>
                </div>
              )}
              {preview.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs font-medium text-gray-500 mb-1.5">Будет создано <strong>{preview.length}</strong> смен</p>
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                    {preview.slice(0, 60).map((d) => (
                      <span key={d} className="text-[10px] bg-white px-1.5 py-0.5 rounded-md border border-gray-100 text-gray-600">
                        {new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                      </span>
                    ))}
                    {preview.length > 60 && <span className="text-[10px] text-gray-400">+ ещё {preview.length - 60}</span>}
                  </div>
                </div>
              )}
              <button type="submit" disabled={saving || preview.length === 0}
                className="flex items-center justify-center gap-2 w-full bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                <Zap size={16} /> {saving ? 'Создание...' : `Создать ${preview.length} смен`}
              </button>
            </form>
          )}
          {message && (
            <div className={`flex items-center gap-2 text-sm p-3 rounded-xl ${isSuccess ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
              {isSuccess ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {message}
            </div>
          )}
        </div>
      )}

      <div className="relative">
        <select value={activeCenterId || ''}
          onChange={(e) => setActiveCenterId(Number(e.target.value))}
          className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 appearance-none cursor-pointer mb-3">
          {adminCenterOptions.map((c: any) => (<option key={c.id} value={c.id}>{c.address ? `${c.name} (${c.address})` : c.name}</option>))}
        </select>
        <Building2 size={16} className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
      </div>

      <div className="flex gap-1.5 bg-gray-100 p-1 rounded-2xl">
        <button onClick={() => { setViewMode('week'); localStorage.setItem(STORAGE_VIEW_KEY, 'week'); }}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
            viewMode === 'week' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}>Неделя</button>
        <button onClick={() => { setViewMode('month'); localStorage.setItem(STORAGE_VIEW_KEY, 'month'); }}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
            viewMode === 'month' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}>Месяц</button>
      </div>

      <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
        <button onClick={() => viewMode === 'week' ? setWeekOffset(p => p - 1) : setMonthOffset(p => p - 1)}
          className="p-1.5 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-indigo-600">
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold text-gray-900">{headerLabel}</span>
        <button onClick={() => viewMode === 'week' ? setWeekOffset(p => p + 1) : setMonthOffset(p => p + 1)}
          className="p-1.5 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-indigo-600">
          <ChevronRight size={16} />
        </button>
      </div>

      {selectMode && selectedIds.size > 0 && (
        <div className="flex items-center justify-between bg-red-50 p-3 rounded-2xl border border-red-200 shadow-sm">
          <span className="text-sm font-medium text-red-700">Выбрано: {selectedIds.size}</span>
          <div className="flex gap-2">
            <button onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-gray-600 bg-white hover:bg-gray-50 transition-colors">
              Снять все
            </button>
            <button onClick={handleBulkDelete}
              className="px-4 py-1.5 rounded-xl text-xs font-medium text-white bg-red-600 hover:bg-red-700 transition-colors">
              Удалить
            </button>
          </div>
        </div>
      )}

      {employees.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
          <div className="p-3 rounded-xl bg-gray-50 inline-flex mb-3">
            <Calendar size={24} className="text-gray-300" />
          </div>
          <p className="text-sm text-gray-400">Нет смен в выбранном периоде</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-max border-collapse">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="sticky left-0 z-10 bg-white text-left text-xs font-medium text-gray-400 px-3 py-2.5 min-w-[120px]">
                    Сотрудник
                  </th>
                  {days.map((day, i) => (
                    <th
                      key={day}
                      className={`text-center text-xs font-medium px-2 py-2.5 ${
                        day === todayStr ? 'text-indigo-600 bg-indigo-50/50' : 'text-gray-400'
                      }`}
                    >
                      <div>{WEEKDAYS[i % 7]}</div>
                      <div className="text-lg font-bold">{new Date(day).getDate()}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map((emp: any) => (
                  <tr key={`${emp.user_id}-${emp.service_center_id}`} className="border-b border-gray-50 last:border-b-0">
                    <td className="sticky left-0 z-10 bg-white px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: emp.user_color || '#6366f1' }}
                        />
                        <span className="text-sm font-medium text-gray-900 truncate">{emp.user_name}</span>
                      </div>
                    </td>
                    {days.map((day) => {
                      const entry = emp.entries?.find((e: any) => e.date === day) || null;
                      const isToday = day === todayStr;
                      const checked = entry && selectedIds.has(entry.id);
                      return (
                        <td
                          key={day}
                          onClick={() => {
                            if (!entry) return;
                            if (selectMode) toggleSelect(entry.id);
                            else setDetailEntry(entry);
                          }}
                          className={`text-center text-xs px-2 py-2.5 ${
                            isToday ? 'bg-indigo-50/20' : ''
                          } ${entry ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default'} ${
                            selectMode && checked ? 'bg-indigo-50' : ''
                          }`}
                        >
                          {entry ? (
                            <div className="flex items-center justify-center gap-1">
                              {selectMode && (
                                <input type="checkbox" checked={checked}
                                  onChange={() => toggleSelect(entry.id)}
                                  className="shrink-0 accent-indigo-500 w-3 h-3" />
                              )}
                              <span className={`inline-block px-1.5 py-0.5 rounded-md font-medium ${
                                entry.type === 'full_day'
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'bg-purple-50 text-purple-700'
                              }`}>
                                {entry.type === 'full_day' ? 'В.день' : `${entry.start_time || ''}–${entry.end_time || ''}`}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-200">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AdminHistoryWidget />

      {detailEntry && (
        <ScheduleDetailModal
          entry={detailEntry}
          onClose={() => setDetailEntry(null)}
          onDelete={(id) => { setDetailEntry(null); handleDelete(id); }}
        />
      )}
    </div>
  );
}
