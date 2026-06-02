import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, formatLocal } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useCenters } from '../contexts/CenterContext';
import { useSocketEvent } from '../contexts/SocketContext';
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Sun,
  ArrowRightLeft,
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import ScheduleDetailModal from '../components/ScheduleDetailModal';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const STORAGE_VIEW_KEY = 'scheduleViewMode';

type ViewMode = 'week' | 'month';

export default function MySchedule() {
  const { user, isOwner, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { centers, activeCenterId, setActiveCenterId } = useCenters();
  const [incomingCount, setIncomingCount] = useState(0);

  const loadIncoming = useCallback(async () => {
    if (!user) return;
    try {
      const swaps = isOwner ? await api.swaps.admin() : await api.swaps.list();
      const pending = swaps.filter(
        (s: any) => s.status === 'pending' && s.responder_id === user.id
      );
      setIncomingCount(pending.length);
    } catch { setIncomingCount(0); }
  }, [user, isOwner]);

  useEffect(() => { loadIncoming(); }, [loadIncoming]);
  useSocketEvent("swap:updated", loadIncoming);
  const [grouped, setGrouped] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    (localStorage.getItem(STORAGE_VIEW_KEY) as ViewMode) || 'week'
  );
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [detailEntry, setDetailEntry] = useState<any>(null);

  useEffect(() => {
    if (isOwner || isAdmin) {
      navigate('/schedule/admin', { replace: true });
    }
  }, [isOwner, isAdmin]);

  useEffect(() => {
    if (!activeCenterId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    localStorage.setItem('activeCenterId', String(activeCenterId));

    const today = new Date();

    if (viewMode === 'week') {
      const monday = new Date(today);
      monday.setDate(today.getDate() - today.getDay() + 1 + weekOffset * 7);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      api.schedule.myGrouped(activeCenterId, {
        from: formatLocal(monday),
        to: formatLocal(sunday),
      }).then(setGrouped).catch(console.error).finally(() => setLoading(false));
    } else {
      const y = today.getFullYear();
      const m = today.getMonth() + monthOffset;
      const first = new Date(y, m, 1);
      const last = new Date(y, m + 1, 0);
      api.schedule.myGrouped(activeCenterId, {
        from: formatLocal(first),
        to: formatLocal(last),
      }).then(setGrouped).catch(console.error).finally(() => setLoading(false));
    }
  }, [activeCenterId, viewMode, weekOffset, monthOffset]);

  const changeView = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem(STORAGE_VIEW_KEY, mode);
  };

  const todayStr = formatLocal(new Date());
  const today = new Date();

  // Week data
  const weekMonday = new Date(today);
  weekMonday.setDate(today.getDate() - today.getDay() + 1 + weekOffset * 7);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekMonday);
    d.setDate(weekMonday.getDate() + i);
    return formatLocal(d);
  });

  // Month data
  const monthDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const monthLabel = monthDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const startWeekday = monthDate.getDay() === 0 ? 6 : monthDate.getDay() - 1; // 0=Mon
  const monthDays: string[] = [];
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(monthDate.getFullYear(), monthDate.getMonth(), i);
    monthDays.push(formatLocal(d));
  }

  if (centers.length === 0) {
    return (
      <div className="text-center py-12">
        <Sun size={32} className="text-gray-200 mx-auto mb-3" />
        <p className="text-sm text-gray-400">Нет доступных складов</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Мой график</h1>
        <div className="mt-2 relative">
          <select
            value={activeCenterId || ''}
            onChange={(e) => setActiveCenterId(Number(e.target.value))}
            className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 appearance-none cursor-pointer"
          >
            {centers.map((c) => (
              <option key={c.id} value={c.id}>{c.address ? `${c.name} (${c.address})` : c.name}</option>
            ))}
          </select>
          <Building2
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
        </div>
      </div>

      <Link
        to="/swaps"
        className="flex items-center justify-center gap-1.5 w-full bg-white border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm relative"
      >
        <ArrowRightLeft size={15} /> Обмен сменами
        {incomingCount > 0 && (
          <span className="ml-1 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1 leading-none">
            {incomingCount > 99 ? '99+' : incomingCount}
          </span>
        )}
      </Link>

      <div className="flex gap-1.5 bg-gray-100 p-1 rounded-2xl">
        <button
          onClick={() => changeView('week')}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
            viewMode === 'week'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Неделя
        </button>
        <button
          onClick={() => changeView('month')}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
            viewMode === 'month'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Месяц
        </button>
      </div>

      <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
        <button
          onClick={() => viewMode === 'week' ? setWeekOffset((p) => p - 1) : setMonthOffset((p) => p - 1)}
          className="p-1.5 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-indigo-600"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold text-gray-900">
          {viewMode === 'week'
            ? weekDays[0] && weekDays[6]
              ? `${new Date(weekDays[0]).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} – ${new Date(weekDays[6]).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`
              : ''
            : monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
        </span>
        <button
          onClick={() => viewMode === 'week' ? setWeekOffset((p) => p + 1) : setMonthOffset((p) => p + 1)}
          className="p-1.5 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-indigo-600"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : viewMode === 'week' ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="grid grid-cols-7 border-b border-gray-100">
            {WEEKDAYS.map((d, i) => (
              <div
                key={d}
                className={`py-2 text-center text-xs font-medium ${
                  weekDays[i] === todayStr ? 'text-indigo-600 bg-indigo-50/50' : 'text-gray-400'
                }`}
              >
                {d}
                <div className="text-lg font-bold">{new Date(weekDays[i]).getDate()}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {weekDays.map((day) => {
              const dayEntries = grouped[day] || [];
              const isToday = day === todayStr;
              return (
                <div
                  key={day}
                  className={`min-h-[80px] p-1.5 border-r border-gray-50 last:border-r-0 ${
                    isToday ? 'bg-indigo-50/20' : ''
                  }`}
                >
                  {dayEntries.length > 0 ? (
                    <div className="space-y-1">
                      {dayEntries.map((e: any) => (
                        <div
                          key={e.id}
                          onClick={() => setDetailEntry(e)}
                          className={`text-[10px] p-1.5 rounded-lg leading-tight cursor-pointer ${
                            e.type === 'full_day'
                              ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                              : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                          }`}
                        >
                          <div className="font-medium">
                            {e.type === 'full_day' ? 'Весь день' : `${e.start_time || ''}–${e.end_time || ''}`}
                          </div>
                          {e.notes && (
                            <div className="text-[8px] opacity-70 mt-0.5 truncate">{e.notes}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <span className="text-[10px] text-gray-200">–</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="grid grid-cols-7 border-b border-gray-100">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-2 text-center text-xs font-medium text-gray-400">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: startWeekday }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[72px] bg-gray-50/30" />
            ))}
            {monthDays.map((day) => {
              const dayEntries = grouped[day] || [];
              const isToday = day === todayStr;
              return (
                <div
                  key={day}
                  className={`min-h-[72px] p-1 border-r border-b border-gray-50 ${
                    isToday ? 'bg-indigo-50/20' : ''
                  }`}
                >
                  <div className={`text-[10px] font-medium mb-0.5 ${isToday ? 'text-indigo-600' : 'text-gray-400'}`}>
                    {new Date(day).getDate()}
                  </div>
                  {dayEntries.length > 0 && (
                    <div className="space-y-0.5">
                      {dayEntries.slice(0, 2).map((e: any) => (
                        <div
                          key={e.id}
                          onClick={() => setDetailEntry(e)}
                          className={`text-[8px] p-0.5 rounded leading-tight cursor-pointer ${
                            e.type === 'full_day' ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                          }`}
                        >
                          {e.type === 'full_day' ? 'Весь день' : `${e.start_time || ''}`}
                        </div>
                      ))}
                      {dayEntries.length > 2 && (
                        <div className="text-[8px] text-gray-400 font-medium">+{dayEntries.length - 2}</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {detailEntry && (
        <ScheduleDetailModal
          entry={detailEntry}
          onClose={() => setDetailEntry(null)}
        />
      )}
    </div>
  );
}
