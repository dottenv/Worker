import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io, type Socket } from 'socket.io-client';
import {
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  Radio,
  CalendarDays,
  X,
} from 'lucide-react';

const DAY_NAMES = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

function fmtLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function ScheduleWidget() {
  const { scId } = useParams<{ scId: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [monthOffset, setMonthOffset] = useState(0);
  const [connected, setConnected] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const socketRef = useRef<Socket | null>(null);

  const today = new Date();
  const monthDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const monthLabel = monthDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const days: string[] = [];
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(monthDate.getFullYear(), monthDate.getMonth(), i);
    days.push(fmtLocal(d));
  }
  const todayStr = fmtLocal(today);

  const load = () => {
    if (!scId) return;
    setLoading(true);
    const from = days[0];
    const to = days[days.length - 1];
    const token = localStorage.getItem('token');
    fetch(
      `/api/schedule/widget?service_center_id=${scId}&from=${from}&to=${to}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
    )
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scId, monthOffset]);

  // real-time socket (anonymous public connection)
  useEffect(() => {
    if (!scId) return;
    const s = io(window.location.origin, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
    });
    socketRef.current = s;
    s.on('connect', () => {
      setConnected(true);
      s.emit('widget:join', { service_center_id: Number(scId) });
    });
    s.on('disconnect', () => setConnected(false));
    s.on('connect_error', () => setConnected(false));
    s.on('schedule:updated', () => load());

    return () => {
      try {
        s.emit('widget:leave', { service_center_id: Number(scId) });
        s.removeAllListeners();
        s.disconnect();
      } catch {
        /* ignore */
      }
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scId]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().then(() => setFullscreen(true)).catch(() => setFullscreen(true));
    } else {
      document.exitFullscreen?.().then(() => setFullscreen(false));
    }
  };

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const employees = data?.employees || [];

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-white border-b border-gray-200 shadow-sm">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
            {data?.service_center?.name || 'График'}
          </h1>
          {data?.service_center?.address && (
            <p className="text-xs sm:text-sm text-gray-400 truncate">
              {data.service_center.address}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
              connected ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'
            }`}
            title={connected ? 'Обновления в реальном времени активны' : 'Нет соединения'}
          >
            <Radio size={13} className={connected ? 'animate-pulse' : ''} />
            {connected ? 'Live' : 'Offline'}
          </span>
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            title="На весь экран"
          >
            {fullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
            <span className="hidden sm:inline">{fullscreen ? 'Выйти' : 'На весь экран'}</span>
          </button>
        </div>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3">
        <button
          onClick={() => setMonthOffset((p) => p - 1)}
          className="p-2 rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-200 transition-colors shadow-sm"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center gap-2 text-base sm:text-xl font-semibold text-gray-900">
          <CalendarDays size={18} className="text-indigo-500" />
          {monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
        </div>
        <button
          onClick={() => setMonthOffset((p) => p + 1)}
          className="p-2 rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-200 transition-colors shadow-sm"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Schedule table */}
      <div className="flex-1 px-2 sm:px-6 pb-6 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">Загрузка…</div>
        ) : employees.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <CalendarDays size={40} className="mb-3 text-gray-200" />
            <p className="text-sm">Нет смен в выбранном периоде</p>
          </div>
        ) : (
          <div className="inline-block min-w-full bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="sticky left-0 z-10 bg-white text-left text-sm font-semibold text-gray-500 px-4 py-3 min-w-[180px]">
                    Сотрудник
                  </th>
                  {days.map((day) => {
                    const isToday = day === todayStr;
                    return (
                      <th
                        key={day}
                        className={`text-center px-2 py-3 ${
                          isToday ? 'text-indigo-600 bg-indigo-50/50' : 'text-gray-500'
                        }`}
                      >
                        <div className="text-xs font-medium">{DAY_NAMES[new Date(day).getDay()]}</div>
                        <div className="text-xl font-bold leading-none mt-1">
                          {new Date(day).getDate()}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {employees.map((emp: any) => (
                  <tr
                    key={`${emp.user_id}-${emp.role}`}
                    className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50/40"
                  >
                    <td className="sticky left-0 z-10 bg-white px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: emp.user_color || '#6366f1' }}
                        />
                        <span className="text-sm font-semibold text-gray-900 truncate">
                          {emp.user_name}
                        </span>
                      </div>
                    </td>
                    {days.map((day) => {
                      const entry = (emp.entries || []).find((e: any) => e.date === day) || null;
                      const isToday = day === todayStr;
                      return (
                        <td
                          key={day}
                          onClick={() => entry && setDetail(entry)}
                          className={`text-center px-2 py-3 ${
                            isToday ? 'bg-indigo-50/20' : ''
                          } ${entry ? 'cursor-pointer hover:bg-indigo-50/60' : ''}`}
                        >
                          {entry ? (
                            <span
                              className="inline-block px-2 py-1 rounded-lg text-sm font-semibold"
                              style={
                                entry.shift_color
                                  ? {
                                      backgroundColor: entry.shift_color + '20',
                                      color: entry.shift_color,
                                    }
                                  : entry.type === 'full_day'
                                    ? { backgroundColor: '#dbeafe', color: '#1d4ed8' }
                                    : { backgroundColor: '#ede9fe', color: '#6d28d9' }
                              }
                            >
                              {entry.type === 'full_day'
                                ? entry.shift_name || 'В.день'
                                : `${entry.start_time || ''}–${entry.end_time || ''}`}
                            </span>
                          ) : (
                            <span className="text-gray-200 text-sm">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Read-only detail modal (comments) */}
      {detail && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-30 p-5"
          onClick={() => setDetail(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  {detail.user_name}
                </h3>
                <p className="text-xs text-gray-400">
                  {new Date(detail.date).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <button
                onClick={() => setDetail(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Тип</span>
                <span className="font-medium text-gray-900">
                  {detail.type === 'full_day' ? 'Весь день' : 'По часам'}
                </span>
              </div>
              {detail.shift_name && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Смена</span>
                  <span className="font-medium text-gray-900">{detail.shift_name}</span>
                </div>
              )}
              {detail.type === 'hourly' && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Время</span>
                  <span className="font-medium text-gray-900">
                    {detail.start_time}–{detail.end_time}
                  </span>
                </div>
              )}
              <div className="pt-1 border-t border-gray-100">
                <p className="text-gray-400 text-xs mb-1">Комментарий</p>
                <p className="text-gray-800 whitespace-pre-wrap">
                  {detail.notes || '—'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
