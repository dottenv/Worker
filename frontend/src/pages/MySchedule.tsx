import { useEffect, useState, useCallback, useMemo } from 'react';
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

const DAY_NAMES = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const STORAGE_VIEW_KEY = 'scheduleViewMode';

type ViewMode = 'week' | 'month';

export default function MySchedule() {
  const navigate = useNavigate();
  const { user, isOwner } = useAuth();
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

  // Redirect owners/admins to admin schedule page
  useEffect(() => {
    if (isOwner) {
      navigate('/schedule/admin', { replace: true });
    }
  }, [isOwner]);

  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    (localStorage.getItem(STORAGE_VIEW_KEY) as ViewMode) || 'week'
  );
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [detailEntry, setDetailEntry] = useState<any>(null);
  const [onlyMine, setOnlyMine] = useState(false);

  const today = new Date();
  const todayStr = formatLocal(today);

  // ---- date ranges ----
  const weekMonday = useMemo(() => {
    const d = new Date(today);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) + weekOffset * 7;
    d.setDate(diff);
    return d;
  }, [weekOffset]);

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekMonday);
      d.setDate(weekMonday.getDate() + i);
      return formatLocal(d);
    }),
  [weekMonday]);

  const monthDate = useMemo(
    () => new Date(today.getFullYear(), today.getMonth() + monthOffset, 1),
    [monthOffset]
  );
  const monthLabel = monthDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  const monthDays = useMemo(() => {
    const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(monthDate.getFullYear(), monthDate.getMonth(), i + 1);
      return formatLocal(d);
    });
  }, [monthDate]);

  // ---- load data ----
  useEffect(() => {
    if (!activeCenterId) {
      setLoading(false);
      setEmployees([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const from = viewMode === 'week' ? weekDays[0] : monthDays[0];
    const to = viewMode === 'week' ? weekDays[6] : monthDays[monthDays.length - 1];

    (async () => {
      // 1. Load active members to build table rows
      let members: any[] = [];
      try {
        members = await api.members.list(activeCenterId);
      } catch {}

      // 2. Load entries grouped by date
      let byDate: Record<string, any[]> = {};
      try {
        byDate = await api.schedule.myGrouped(activeCenterId, { from, to });
      } catch {}

      if (cancelled) return;

      // 3. Build rows from members, merge entries into them
      const userMap: Record<string, any> = {};
      for (const m of members) {
        const key = `${m.user_id}-${activeCenterId}`;
        userMap[key] = {
          user_id: m.user_id,
          user_name: m.user?.full_name || '',
          user_color: m.user?.color || '',
          service_center_id: activeCenterId,
          service_center_name: '',
          role: m.role || '',
          entries: [],
        };
      }

      // 4. Merge entries (also handles case where members API failed)
      for (const day of Object.keys(byDate)) {
        for (const e of byDate[day]) {
          const key = `${e.user_id}-${e.service_center_id}`;
          if (!userMap[key]) {
            userMap[key] = {
              user_id: e.user_id,
              user_name: e.user_name,
              user_color: e.user_color || '',
              service_center_id: e.service_center_id,
              service_center_name: e.service_center_name || '',
              role: e.role || '',
              entries: [],
            };
          }
          userMap[key].entries.push(e);
        }
      }

      // 5. Fallback: if still no rows, try /schedule/my (no membership check)
      if (Object.keys(userMap).length === 0) {
        try {
          const myEntries = await api.schedule.my({ service_center_id: activeCenterId, from, to });
          if (myEntries.length > 0 && user) {
            setEmployees([{
              user_id: user.id,
              user_name: user.full_name,
              user_color: user.color || '',
              service_center_id: activeCenterId,
              service_center_name: '',
              role: '',
              entries: myEntries,
            }]);
            return;
          }
        } catch {}
        setEmployees([]);
        return;
      }

      setEmployees(Object.values(userMap));
    })();

    return () => { cancelled = true; };
  }, [activeCenterId, viewMode, weekOffset, monthOffset, user]);

  const changeView = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem(STORAGE_VIEW_KEY, mode);
  };

  // ---- helpers ----
  const days = viewMode === 'week' ? weekDays : monthDays;

  function getCell(emp: any, day: string) {
    return emp.entries?.find((e: any) => e.date === day) || null;
  }

  function cellLabel(entry: any) {
    if (!entry) return '—';
    if (entry.type === 'full_day') return 'В.день';
    return `${entry.start_time || ''}–${entry.end_time || ''}`;
  }

  const filtered = onlyMine && user
    ? employees.filter((e: any) => e.user_id === user.id)
    : employees;

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
        <Building2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
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
            ? `${new Date(weekDays[0]).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} – ${new Date(weekDays[6]).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`
            : monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
        </span>
        <button
          onClick={() => viewMode === 'week' ? setWeekOffset((p) => p + 1) : setMonthOffset((p) => p + 1)}
          className="p-1.5 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-indigo-600"
        >
          <ChevronRight size={16} />
        </button>
        <button
          onClick={() => setOnlyMine((p) => !p)}
          className={`ml-auto flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
            onlyMine
              ? 'bg-indigo-50 text-indigo-600'
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
          }`}
        >
          {onlyMine ? (
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path d="M8 1a3 3 0 100 6 3 3 0 000-6zM2 13v-1a3 3 0 013-3h1.1a4.5 4.5 0 00-.1 1c0 .7.18 1.37.5 1.95A8.5 8.5 0 012 13zM12.5 7a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM10 13.5c.33.32.73.55 1.18.68a2.5 2.5 0 002.64-.68H10z"/></svg>
          ) : (
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path d="M8 1a3 3 0 100 6 3 3 0 000-6zM2 13v-1a3 3 0 013-3h6a3 3 0 013 3v1H2z"/></svg>
          )}
          Только мои
        </button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
          <div className="p-3 rounded-xl bg-gray-50 inline-flex mb-3">
            <Sun size={24} className="text-gray-300" />
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
                  {days.map((day) => (
                    <th
                      key={day}
                      className={`text-center text-xs font-medium px-2 py-2.5 ${
                        day === todayStr ? 'text-indigo-600 bg-indigo-50/50' : 'text-gray-400'
                      }`}
                    >
                      <div>{DAY_NAMES[new Date(day).getDay()]}</div>
                      <div className="text-lg font-bold">{new Date(day).getDate()}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp: any) => (
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
                      const entry = getCell(emp, day);
                      const isToday = day === todayStr;
                      return (
                        <td
                          key={day}
                          onClick={() => entry && setDetailEntry(entry)}
                          className={`text-center text-xs px-2 py-2.5 cursor-default ${
                            isToday ? 'bg-indigo-50/20' : ''
                          } ${entry ? 'hover:bg-gray-50 cursor-pointer' : ''}`}
                        >
                          {entry ? (
                            <span className={`inline-block px-1.5 py-0.5 rounded-md font-medium ${
                              entry.type === 'full_day'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-purple-50 text-purple-700'
                            }`}>
                              {cellLabel(entry)}
                            </span>
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

      {detailEntry && (
        <ScheduleDetailModal
          entry={detailEntry}
          onClose={() => setDetailEntry(null)}
        />
      )}
    </div>
  );
}
