import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api, formatLocal } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useCenters } from '../contexts/CenterContext';
import { useSocketEvent } from '../contexts/SocketContext';
import {
  Calendar,
  Building2,
  Users,
  ArrowRight,
  Zap,
  Clock,
  Play,
  Square,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Plus,
  Upload,
  DollarSign,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { StatsSkeleton } from '../components/Skeleton';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Dashboard() {
  const { user, isOwner, isAdmin } = useAuth();
  const { centers, activeCenterId } = useCenters();
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [employeesCount, setEmployeesCount] = useState(0);
  const [shiftsThisMonth, setShiftsThisMonth] = useState(0);
  const [weekGrouped, setWeekGrouped] = useState<Record<string, any[]>>({});
  const [weekLoading, setWeekLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeEntry, setActiveEntry] = useState<any>(null);
  const [clockLoading, setClockLoading] = useState(false);
  const [clockMessage, setClockMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [clockNotes, setClockNotes] = useState('');
  const [attendanceByCenter, setAttendanceByCenter] = useState<any[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [expandedCenters, setExpandedCenters] = useState<Set<number>>(new Set());
  const [workStats, setWorkStats] = useState<{ weekHours: number; monthHours: number; completedShifts: number } | null>(null);
  const [displayMonth, setDisplayMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [hasScheduledToday, setHasScheduledToday] = useState(false);

  // Close shift modal
  const [closeModalEntry, setCloseModalEntry] = useState<any>(null);
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [customValues, setCustomValues] = useState<Record<number, string>>({});
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [recentDocs, setRecentDocs] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.timeEntries.active().then(e => {
      setActiveEntry(e);
    }).catch(() => {});
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const isManager = isOwner || isAdmin;
      const entries = await (isManager ? api.schedule.admin() : api.schedule.my());
      const now = new Date();
      const monthStart = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), 1);
      const monthEnd = new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 0);

      if (isManager) {
        const allEntries = entries.flatMap((g: any) => g.entries || []);
        setUpcomingCount(allEntries.filter((e: any) => new Date(e.date) >= now).length);
        setEmployeesCount(new Set(allEntries.filter((e: any) => {
          const d = new Date(e.date);
          return d >= monthStart && d <= monthEnd;
        }).map((g: any) => g.user_id)).size);
        setShiftsThisMonth(allEntries.filter((e: any) => {
          const d = new Date(e.date);
          return d >= monthStart && d <= monthEnd;
        }).length);
      } else {
        setUpcomingCount(entries.filter((e: any) => new Date(e.date) >= now).length);
        setShiftsThisMonth(entries.filter((e: any) => {
          const d = new Date(e.date);
          return d >= monthStart && d <= monthEnd;
        }).length);
      }
    } catch {}
    finally { setLoading(false); }
  }, [isOwner, isAdmin, displayMonth]);

  const loadStatsRef = useRef(loadStats);
  loadStatsRef.current = loadStats;

  const loadWeekSchedule = useCallback(async () => {
    if (isOwner || isAdmin) return;
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const from = formatLocal(monday);
    const to = formatLocal(sunday);
    setWeekLoading(true);
    api.schedule.my({ from, to }).then((entries: any[]) => {
      const grouped: Record<string, any[]> = {};
      for (const e of entries) {
        if (!grouped[e.date]) grouped[e.date] = [];
        grouped[e.date].push(e);
      }
      setWeekGrouped(grouped);
    }).catch(console.error).finally(() => setWeekLoading(false));
  }, [isOwner, isAdmin]);

  const loadWeekRef = useRef(loadWeekSchedule);
  loadWeekRef.current = loadWeekSchedule;

  const loadWorkStats = useCallback(async () => {
    if (isOwner || isAdmin) return;
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1);
    const monthStart = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), 1);
    const monthEnd = new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 0);
    api.timeEntries.my().then((entries: any[]) => {
      const approved = entries.filter((e: any) => e.status === 'approved' && e.clock_in && e.clock_out);
      const weekEntries = approved.filter((e: any) => {
        const d = new Date(e.date);
        return d >= startOfWeek && d <= now;
      });
      const monthEntries = approved.filter((e: any) => {
        const d = new Date(e.date);
        return d >= monthStart && d <= monthEnd;
      });
      const toHours = (ms: number) => Math.round(ms / 3600000 * 10) / 10;
      const weekHours = weekEntries.reduce((sum: number, e: any) =>
        sum + toHours(new Date(e.clock_out).getTime() - new Date(e.clock_in).getTime()), 0);
      const monthHours = monthEntries.reduce((sum: number, e: any) =>
        sum + toHours(new Date(e.clock_out).getTime() - new Date(e.clock_in).getTime()), 0);
      setWorkStats({ weekHours, monthHours, completedShifts: monthEntries.length });
    }).catch(() => {});
  }, [isOwner, isAdmin, displayMonth]);

  const loadWorkStatsRef = useRef(loadWorkStats);
  loadWorkStatsRef.current = loadWorkStats;

  useEffect(() => { loadStats(); }, [loadStats]);

  useEffect(() => { loadWeekSchedule(); }, [loadWeekSchedule]);

  const isManager = isOwner || isAdmin;

  // Check if user has scheduled shift today (for all users including managers)
  const checkScheduledToday = useCallback(async () => {
    if (!activeCenterId) return;
    const todayStr = formatLocal(new Date());
    try {
      const entries = await api.schedule.my({ service_center_id: activeCenterId, from: todayStr, to: todayStr });
      setHasScheduledToday(entries && entries.length > 0);
    } catch {
      setHasScheduledToday(false);
    }
  }, [activeCenterId]);

  const checkScheduledRef = useRef(checkScheduledToday);
  checkScheduledRef.current = checkScheduledToday;

  useEffect(() => { checkScheduledToday(); }, [checkScheduledToday]);

  useEffect(() => {
    if (!isManager) return;
    const managed = centers.filter((c: any) => ['owner', 'admin'].includes(c.role));
    if (managed.length === 0) return;
    const todayStr = formatLocal(new Date());
    setAttendanceLoading(true);

    Promise.all(managed.map(async (c: any) => {
      const [scheduleData, timeEntries] = await Promise.all([
        api.schedule.admin({ from: todayStr, to: todayStr, service_center_id: c.id }).catch(() => []),
        api.timeEntries.center(c.id, { from: todayStr, to: todayStr }).catch(() => []),
      ]);
      const scheduled = scheduleData.flatMap((g: any) =>
        (g.entries || []).map((e: any) => ({ ...e, user_name: g.user_name, user_color: g.user_color }))
      );
      const clocked = (timeEntries || []).filter((e: any) => (e.status === 'approved' || e.status === 'pending') && !e.clock_out);
      return {
        centerId: c.id,
        centerName: c.address ? `${c.name} (${c.address})` : c.name,
        members_count: c.members_count,
        scheduled,
        clocked,
      };
    })).then(results => {
      setAttendanceByCenter(results);
      setExpandedCenters(new Set(results.map(r => r.centerId)));
      // Check if user has scheduled shift today (manager can be also employee in some center)
      const myScheduledToday = results.some((c: any) => 
        c.scheduled.some((e: any) => e.user_id === user?.id)
      );
      setHasScheduledToday(myScheduledToday);
    }).finally(() => setAttendanceLoading(false));
  }, [isManager, centers, user]);

  const mergeTimeEntry = useCallback((entry: any) => {
    const scId = entry.service_center_id;
    setAttendanceByCenter(prev => {
      const updated = prev.map(c => {
        if (c.centerId !== scId) return c;
        const exists = entry.id && (entry.status === 'approved' || entry.status === 'pending');
        if (!exists) return c;
        return {
          ...c,
          clocked: [...c.clocked.filter((e: any) => e.id !== entry.id), entry],
        };
      });
      return updated;
    });
  }, []);

  useSocketEvent('time_entry:clock_in', mergeTimeEntry);
  useSocketEvent('time_entry:pending_clock_in', mergeTimeEntry);
  useSocketEvent('time_entry:clock_out', (entry: any) => {
    setAttendanceByCenter(prev => prev.map(c => ({
      ...c,
      clocked: c.clocked.filter((e: any) => e.id !== entry.id),
    })));
  });
  useSocketEvent('time_entry:approved', (entry: any) => {
    loadAttendance();
    if (entry.user_id === user?.id) {
      setActiveEntry((prev: any) => prev && prev.id === entry.id ? { ...prev, status: entry.status } : prev);
    }
  });
  useSocketEvent('time_entry:rejected', (entry: any) => {
    setAttendanceByCenter(prev => prev.map(c => ({
      ...c,
      clocked: c.clocked.filter((e: any) => e.id !== entry.id),
    })));
    // employee: clear activeEntry if rejected
    setActiveEntry((prev: any) => prev && prev.id === entry.id ? null : prev);
  });

  // schedule changes → refresh data for both employee and owner
  const refreshOnScheduleChange = useCallback(() => {
    loadStatsRef.current();
    loadWeekRef.current();
    loadWorkStatsRef.current();
    checkScheduledRef.current();
  }, []);
  const refreshScheduleRef = useRef(refreshOnScheduleChange);
  refreshScheduleRef.current = refreshOnScheduleChange;
  useSocketEvent('schedule:updated', () => { refreshScheduleRef.current(); });

  // re-fetch attendance for owner when schedule or members change
  const loadAttendance = useCallback(async () => {
    if (!isOwner && !isAdmin) return;
    const managed = centers.filter((c: any) => ['owner', 'admin'].includes(c.role));
    if (managed.length === 0) return;
    try {
      const results = await Promise.all(managed.map(async (c: any) => {
        const todayStr = formatLocal(new Date());
        const [scheduleData, timeEntries] = await Promise.all([
          api.schedule.admin({ from: todayStr, to: todayStr, service_center_id: c.id }).catch(() => []),
          api.timeEntries.center(c.id, { from: todayStr, to: todayStr }).catch(() => []),
        ]);
        const scheduled = scheduleData.flatMap((g: any) =>
          (g.entries || []).map((e: any) => ({ ...e, user_name: g.user_name, user_color: g.user_color }))
        );
        const clocked = (timeEntries || []).filter((e: any) => (e.status === 'approved' || e.status === 'pending') && !e.clock_out);
        return {
          centerId: c.id,
          centerName: c.address ? `${c.name} (${c.address})` : c.name,
          members_count: c.members_count,
          scheduled,
          clocked,
        };
      }));
      setAttendanceByCenter(results);
      setExpandedCenters(new Set(results.map(r => r.centerId)));
    } catch {}
  }, [isOwner, isAdmin, centers]);
  const loadAttendanceRef = useRef(loadAttendance);
  loadAttendanceRef.current = loadAttendance;
  useSocketEvent('member:updated', () => { if (isOwner || isAdmin) { loadStatsRef.current(); loadAttendanceRef.current(); } });
  useSocketEvent('center:updated', () => { if (isOwner || isAdmin) { loadStatsRef.current(); } });

  // initial load of employee work stats
  useEffect(() => { loadWorkStats(); }, [loadWorkStats]);

  const handleClockIn = async () => {
    const scId = activeCenterId;
    if (!scId) return;
    setClockLoading(true);
    setClockMessage(null);
    try {
      const entry = await api.timeEntries.clockIn(scId, clockNotes || undefined);
      setActiveEntry(entry);
      setClockNotes('');
      setClockMessage({ ok: true, text: entry.status === 'pending' ? 'Запрос отправлен администратору' : 'Смена начата' });
    } catch (err: any) {
      setClockMessage({ ok: false, text: err.message });
    }
    setClockLoading(false);
    setTimeout(() => setClockMessage(null), 4000);
  };

  const handleClockOut = async () => {
    setClockLoading(true);
    setClockMessage(null);
    try {
      const entry = await api.timeEntries.clockOut();
      setActiveEntry(null);
      // open close-shift modal
      setCloseModalEntry(entry);
      setCustomValues({});
      setRecentDocs([]);
      setUploadError(null);
      // load custom fields
      const scId = entry.service_center_id;
      api.customFields.list(scId).then(fields => {
        setCustomFields(fields);
        const carryFields = fields.filter((f: any) => f.carry_over);
        if (carryFields.length > 0) {
          api.customFields.carryOver(scId, entry.id).then(carry => {
            const vals: Record<number, string> = {};
            for (const f of carryFields) {
              if (carry[f.id]) vals[f.id] = carry[f.id];
            }
            setCustomValues(vals);
          }).catch(() => {});
        }
        api.shiftDocuments.list(entry.id).then(setRecentDocs).catch(() => {});
      }).catch(() => {});
      setClockMessage({ ok: true, text: 'Смена завершена' });
    } catch (err: any) {
      setClockMessage({ ok: false, text: err.message });
    }
    setClockLoading(false);
    setTimeout(() => setClockMessage(null), 4000);
  };

  const handleCloseModalDone = async () => {
    if (!closeModalEntry) return;
    const scId = closeModalEntry.service_center_id;
    const values = Object.entries(customValues)
      .filter(([_, v]) => v !== '')
      .map(([fieldId, value]) => ({ custom_field_id: Number(fieldId), value }));
    if (values.length > 0) {
      try {
        await api.customFields.updateValues(scId, closeModalEntry.id, values);
      } catch {}
    }
    setCloseModalEntry(null);
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length || !closeModalEntry) return;
    const maxFiles = 10;
    const toUpload = Array.from(files).slice(0, maxFiles);
    setUploadingPhoto(true);
    setUploadError(null);
    let lastError: string | null = null;
    for (const file of toUpload) {
      try {
        const doc = await api.shiftDocuments.upload(closeModalEntry.id, file);
        setRecentDocs(prev => [doc, ...prev]);
      } catch (err: any) {
        lastError = err.message || 'Ошибка загрузки';
      }
    }
    setUploadError(lastError);
    setUploadingPhoto(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-5">
      {user && (
        <div>
          <p className="text-sm text-gray-400">Добро пожаловать</p>
          <h1 className="text-xl font-bold text-gray-900">{user.full_name}</h1>
        </div>
      )}

      {/* Month selector */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
        <button onClick={() => setDisplayMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
          className="p-1.5 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-indigo-600 transition-colors">
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-semibold text-gray-900">
          {displayMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
        </span>
        <button onClick={() => setDisplayMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
          className="p-1.5 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-indigo-600 transition-colors">
          <ChevronRight size={18} />
        </button>
      </div>

      {loading ? (
        <StatsSkeleton />
      ) : isManager ? (
        /* ---- OWNER DASHBOARD ---- */
        <>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
              <div className="p-1.5 rounded-xl bg-indigo-50 inline-flex mb-1.5">
                <Building2 size={14} className="text-indigo-500" />
              </div>
              <p className="text-lg font-bold text-gray-900">{centers.length}</p>
              <p className="text-[10px] text-gray-400">Складов</p>
            </div>
            <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
              <div className="p-1.5 rounded-xl bg-emerald-50 inline-flex mb-1.5">
                <Users size={14} className="text-emerald-500" />
              </div>
              <p className="text-lg font-bold text-gray-900">{employeesCount}</p>
              <p className="text-[10px] text-gray-400">Сотрудников</p>
            </div>
            <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
              <div className="p-1.5 rounded-xl bg-amber-50 inline-flex mb-1.5">
                <Calendar size={14} className="text-amber-500" />
              </div>
              <p className="text-lg font-bold text-gray-900">{upcomingCount}</p>
              <p className="text-[10px] text-gray-400">Смен</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Быстрые действия</h3>
            <div className="grid grid-cols-2 gap-2">
              <Link to="/schedule/admin"
                className="flex items-center gap-2.5 p-3 rounded-xl bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100 transition-colors">
                <Zap size={16} />
                Добавить смену
              </Link>
              <Link to="/centers"
                className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100 transition-colors">
                <Building2 size={16} />
                Склады
              </Link>
              <Link to="/schedule/admin"
                className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50 text-amber-700 text-sm font-medium hover:bg-amber-100 transition-colors">
                <Calendar size={16} />
                График
              </Link>
              <Link to="/time-requests"
                className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-50 text-rose-600 text-sm font-medium hover:bg-rose-100 transition-colors">
                <Clock size={16} />
                Запросы
              </Link>
              <Link to="/settings"
                className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 text-gray-600 text-sm font-medium hover:bg-gray-100 transition-colors">
                <Users size={16} />
                Настройки
              </Link>
            </div>
          </div>

          {/* Today's attendance — all centers */}
          {attendanceByCenter.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">Сегодня на смене</h3>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <CheckCircle2 size={12} className="text-emerald-500" />
                  на месте: <strong className="text-gray-800">
                    {attendanceByCenter.reduce((s: number, c: any) =>
                      s + c.clocked.filter((e: any) => e.status === 'approved').length, 0)}
                  </strong>
                </div>
              </div>
              {attendanceLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 size={18} className="animate-spin text-gray-300" />
                </div>
              ) : (
                <div className="space-y-3">
                  {attendanceByCenter.map((center: any) => {
                    const scheduledCount = center.scheduled.length;
                    const clockedCount = center.clocked.filter((e: any) => e.status === 'approved').length;
                    const allEntries = center.scheduled.map((s: any) => {
                      const clocked = center.clocked.find((e: any) =>
                        e.user_id === s.user_id && e.date === s.date && e.status === 'approved'
                      );
                      const pending = center.clocked.find((e: any) =>
                        e.user_id === s.user_id && e.date === s.date && e.status === 'pending'
                      );
                      return { ...s, _clocked: clocked, _pending: pending };
                    });
                    const expanded = expandedCenters.has(center.centerId);
                    return (
                      <div key={center.centerId} className="rounded-xl bg-gray-50 overflow-hidden">
                        <button onClick={() => setExpandedCenters(prev => {
                          const next = new Set(prev);
                          expanded ? next.delete(center.centerId) : next.add(center.centerId);
                          return next;
                        })}
                          className="w-full flex items-center justify-between px-3.5 py-2.5 text-left hover:bg-gray-100 transition-colors">
                          <div className="flex items-center gap-2 min-w-0">
                            <Building2 size={14} className="text-indigo-400 shrink-0" />
                            <span className="text-sm font-medium text-gray-900 truncate">{center.centerName}</span>
                            <span className="text-[10px] text-gray-400 shrink-0">
                              {clockedCount}/{scheduledCount}
                            </span>
                          </div>
                          {expanded ? <ChevronUp size={14} className="text-gray-400 shrink-0" />
                            : <ChevronDown size={14} className="text-gray-400 shrink-0" />}
                        </button>
                        {expanded && (
                          <div className="px-3.5 pb-2.5 space-y-1">
                            {allEntries.length === 0 ? (
                              <p className="text-xs text-gray-400 text-center py-2">Нет запланированных смен</p>
                            ) : allEntries.map((entry: any, i: number) => {
                              const clockedEntry = entry._clocked || entry._pending;
                              return (
                              <div key={entry.id || i}
                                className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white shadow-sm">
                                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-medium text-white"
                                  style={{ backgroundColor: entry.user_color || '#6366f1' }}>
                                  {entry.user_name?.slice(0, 1) || '?'}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">{entry.user_name}</p>
                                  {entry.start_time && entry.end_time ? (
                                    <p className="text-[10px] text-gray-400">{entry.start_time}–{entry.end_time}</p>
                                  ) : (
                                    <p className="text-[10px] text-gray-400">Весь день</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  {clockedEntry && (
                                    <Link to={`/shift-documents/${clockedEntry.id}`}
                                      className="text-[10px] text-indigo-500 hover:text-indigo-700 font-medium px-1.5 py-0.5 rounded hover:bg-indigo-50 transition-colors">
                                      <FileText size={12} />
                                    </Link>
                                  )}
                                  {entry._clocked ? (
                                    <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                      <CheckCircle2 size={10} /> На месте
                                    </span>
                                  ) : entry._pending ? (
                                    <span className="flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                      <Loader2 size={10} className="animate-spin" /> Ожидание
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-gray-300">Нет</span>
                                  )}
                                </div>
                              </div>
                            );})}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {centers.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Мои центры</h3>
                <Link to="/centers" className="text-xs text-indigo-600 flex items-center gap-0.5">
                  Все <ArrowRight size={12} />
                </Link>
              </div>
              <div className="divide-y divide-gray-50">
                {centers.filter((c: any) => c.role === 'owner').slice(0, 5).map((c: any) => (
                  <Link key={c.id} to={`/centers/${c.id}`}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                    <div className="p-2 rounded-xl bg-indigo-50 text-indigo-500">
                      <Building2 size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{c.address ? `${c.name} (${c.address})` : c.name}</p>
                      <p className="text-xs text-gray-400">Сотрудников: {c.members_count}</p>
                    </div>
                    <ArrowRight size={14} className="text-gray-300" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Clock widget for managers - show if has scheduled today */}
          {(hasScheduledToday || activeEntry) && (
            !activeEntry ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={16} className="text-indigo-500" />
                  <h3 className="text-sm font-semibold text-gray-900">Начать смену</h3>
                </div>
                <textarea value={clockNotes} onChange={e => setClockNotes(e.target.value)}
                  placeholder="Комментарий (причина, если смена уже была закрыта)"
                  rows={2}
                  className="w-full mb-3 px-3 py-2 bg-gray-50 border-0 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
                <button onClick={handleClockIn} disabled={clockLoading || !activeCenterId}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors">
                  {clockLoading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                  {clockLoading ? 'Отправка...' : 'Начать смену'}
                </button>
                {clockMessage && (
                  <div className={`flex items-center gap-1.5 mt-2 text-xs ${clockMessage.ok ? 'text-emerald-600' : 'text-red-500'}`}>
                    {clockMessage.ok ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                    {clockMessage.text}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-2 h-2 rounded-full animate-pulse ${activeEntry.status === 'pending' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  <h3 className="text-sm font-semibold text-gray-900">Смена {activeEntry.status === 'pending' ? 'ожидает подтверждения' : 'активна'}</h3>
                </div>
                <div className="text-xs text-gray-400 space-y-1 mb-3">
                  <p>{activeEntry.service_center_address ? `${activeEntry.service_center_name} (${activeEntry.service_center_address})` : activeEntry.service_center_name}</p>
                  <p>Начало: {new Date(activeEntry.clock_in).toLocaleString('ru', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                {activeEntry.status !== 'pending' && (
                  <button onClick={handleClockOut} disabled={clockLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 disabled:opacity-40 transition-colors">
                    {clockLoading ? <Loader2 size={16} className="animate-spin" /> : <Square size={16} />}
                    Завершить смену
                  </button>
                )}
                {activeEntry.status === 'pending' && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 text-amber-700 text-sm">
                    <Clock size={16} />
                    Ожидает подтверждения администратора
                  </div>
                )}
              </div>
            )
          )}
        </>
      ) : centers.length === 0 ? (
        /* ---- NO CENTERS — create org prompt ---- */
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mb-5">
            <Building2 size={32} className="text-indigo-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Создайте свою организацию</h2>
          <p className="text-sm text-gray-400 text-center mb-6 max-w-xs">
            У вас пока нет складов. Создайте свою организацию и начните управлять сменами сотрудников.
          </p>
          <Link
            to="/centers"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus size={18} />
            Создать организацию
          </Link>
          <p className="text-xs text-gray-400 mt-4">
            Или попросите администратора добавить вас в существующий центр
          </p>
        </div>
      ) : (
        /* ---- EMPLOYEE DASHBOARD ---- */
        <>
          {/* Clock-in widget */}
          {!activeEntry ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={16} className="text-indigo-500" />
                <h3 className="text-sm font-semibold text-gray-900">Начать смену</h3>
              </div>
              <textarea value={clockNotes} onChange={e => setClockNotes(e.target.value)}
                placeholder="Комментарий (причина, если смена уже была закрыта)"
                rows={2}
                className="w-full mb-3 px-3 py-2 bg-gray-50 border-0 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
              <button onClick={handleClockIn} disabled={clockLoading || !activeCenterId}
                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors">
                {clockLoading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                {clockLoading ? 'Отправка...' : 'Начать смену'}
              </button>
              {clockMessage && (
                <div className={`flex items-center gap-1.5 mt-2 text-xs ${clockMessage.ok ? 'text-emerald-600' : 'text-red-500'}`}>
                  {clockMessage.ok ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                  {clockMessage.text}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-2 h-2 rounded-full animate-pulse ${activeEntry.status === 'pending' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                <h3 className="text-sm font-semibold text-gray-900">Смена {activeEntry.status === 'pending' ? 'ожидает подтверждения' : 'активна'}</h3>
              </div>
              <div className="text-xs text-gray-400 space-y-1 mb-3">
                <p>{activeEntry.service_center_address ? `${activeEntry.service_center_name} (${activeEntry.service_center_address})` : activeEntry.service_center_name}</p>
                <p>Начало: {new Date(activeEntry.clock_in).toLocaleString('ru', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              {activeEntry.status !== 'pending' && (
                <>
                <button onClick={handleClockOut} disabled={clockLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 disabled:opacity-40 transition-colors">
                  {clockLoading ? <Loader2 size={16} className="animate-spin" /> : <Square size={16} />}
                  Завершить смену
                </button>
                </>
              )}
              {activeEntry.status === 'pending' && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 text-amber-700 text-sm">
                  <Clock size={16} />
                  Ожидает подтверждения администратора
                </div>
              )}
            </div>
          )}

          {/* Today / Tomorrow widget */}
          {!weekLoading && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Ближайшие смены</h3>
              <div className="space-y-2">
                {[{ label: 'Сегодня', offset: 0 }, { label: 'Завтра', offset: 1 }].map(({ label, offset }) => {
                  const d = new Date();
                  d.setDate(d.getDate() + offset);
                  const dayStr = formatLocal(d);
                  const entries = weekGrouped[dayStr] || [];
                  return (
                    <div key={label}
                      className={`rounded-xl p-3 ${offset === 0 ? 'bg-indigo-50' : 'bg-gray-50'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-700">{label}</span>
                        <span className="text-[10px] text-gray-400">
                          {d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                        </span>
                      </div>
                      {entries.length > 0 ? entries.slice(0, 2).map((e: any) => (
                        <div key={e.id} className="flex items-center gap-2 text-xs text-gray-600">
                          {e.shift_name ? (
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: e.shift_color || '#6366f1' }} />
                          ) : (
                            <Clock size={10} className="text-gray-300" />
                          )}
                          {e.type === 'full_day'
                            ? 'Весь день'
                            : `${e.start_time || '–'} – ${e.end_time || '–'}`
                          }
                          {e.shift_name && (
                            <span className="text-gray-400">{e.shift_name}</span>
                          )}
                        </div>
                      )) : (
                        <p className="text-xs text-gray-400">Выходной</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Work statistics */}
          {workStats && !isManager && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Моя статистика</h3>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2.5 rounded-xl bg-indigo-50">
                  <p className="text-lg font-bold text-indigo-700">{workStats.weekHours}</p>
                  <p className="text-[10px] text-indigo-500">часов за неделю</p>
                </div>
                <div className="text-center p-2.5 rounded-xl bg-emerald-50">
                  <p className="text-lg font-bold text-emerald-700">{workStats.monthHours}</p>
                  <p className="text-[10px] text-emerald-500">часов за месяц</p>
                </div>
                <div className="text-center p-2.5 rounded-xl bg-amber-50">
                  <p className="text-lg font-bold text-amber-700">{workStats.completedShifts}</p>
                  <p className="text-[10px] text-amber-500">смен за месяц</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <div className="p-2 rounded-xl bg-indigo-50 inline-flex mb-2">
                <Calendar size={16} className="text-indigo-500" />
              </div>
              <p className="text-lg font-bold text-gray-900">{shiftsThisMonth}</p>
              <p className="text-xs text-gray-400">Смен в этом месяце</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <div className="p-2 rounded-xl bg-emerald-50 inline-flex mb-2">
                <Building2 size={16} className="text-emerald-500" />
              </div>
              <p className="text-lg font-bold text-gray-900">{centers.length}</p>
              <p className="text-xs text-gray-400">Складов</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">График на неделю</h3>
              <Link to="/schedule" className="text-[10px] text-indigo-600 flex items-center gap-0.5">
                Все <ArrowRight size={10} />
              </Link>
            </div>
            {weekLoading ? (
              <LoadingSpinner size={16} className="py-4" />
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {(() => {
                  const today = new Date();
                  const monday = new Date(today);
                  monday.setDate(today.getDate() - today.getDay() + 1);
                  const days = Array.from({ length: 7 }, (_, i) => {
                    const d = new Date(monday);
                    d.setDate(monday.getDate() + i);
                    return formatLocal(d);
                  });
                  const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
                  const todayStr = formatLocal(today);
                  return days.map((day, i) => {
                    const entries = weekGrouped[day] || [];
                    const isToday = day === todayStr;
                    return (
                      <div key={day}
                        className={`rounded-xl p-1.5 text-center min-h-[52px] ${
                          isToday ? 'bg-indigo-50 ring-1 ring-indigo-200' : 'bg-gray-50'
                        }`}
                      >
                        <div className={`text-[9px] font-medium ${isToday ? 'text-indigo-600' : 'text-gray-400'}`}>
                          {weekdays[i]}
                        </div>
                        <div className={`text-xs font-bold ${isToday ? 'text-indigo-700' : 'text-gray-800'}`}>
                          {new Date(day).getDate()}
                        </div>
                        {entries.length > 0 ? (
                          <div className="mt-0.5 space-y-0.5">
                            {entries.slice(0, 2).map((e: any) => (
                              <div key={e.id}
                                className={`text-[6px] px-0.5 py-0.5 rounded leading-tight truncate ${
                                  e.type === 'full_day'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-purple-100 text-purple-800'
                                }`}
                              >
                                {e.type === 'full_day' ? 'Весь день' : `${e.start_time || ''}`}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-0.5 text-[7px] text-gray-200">–</div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>

          <div className="text-center">
            <Link to="/schedule"
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm">
              <Calendar size={16} />
              Мой график
            </Link>
          </div>
        </>
      )}

      {/* Close shift modal */}
      {closeModalEntry && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-20 p-5 animate-modal-overlay">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl space-y-4 animate-modal-body max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-500" />
                <h3 className="text-sm font-semibold text-gray-900">Смена завершена</h3>
              </div>
            </div>

            <p className="text-xs text-gray-400">
              {closeModalEntry.service_center_name} &middot; {closeModalEntry.date}
              <br />
              {closeModalEntry.clock_in && `Начало: ${new Date(closeModalEntry.clock_in).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}`}
              {closeModalEntry.clock_out && ` · Конец: ${new Date(closeModalEntry.clock_out).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}`}
            </p>

            {/* Custom fields */}
            {customFields.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-700">Дополнительные поля</p>
                {customFields.map(field => (
                  <div key={field.id}>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">
                      {field.name}
                      {field.required && <span className="text-red-500 ml-0.5">*</span>}
                      {field.carry_over && <span className="text-indigo-400 ml-1">(перенос)</span>}
                    </label>
                    {field.field_type === 'money' || field.field_type === 'number' ? (
                      <div className="relative">
                        {field.field_type === 'money' && (
                          <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        )}
                        <input type="number" step={field.field_type === 'money' ? '0.01' : '1'}
                          value={customValues[field.id] ?? ''}
                          onChange={e => setCustomValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                          placeholder={field.field_type === 'money' ? '0.00' : '0'}
                          className={`w-full px-3 py-2 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${field.field_type === 'money' ? 'pl-8' : ''}`} />
                      </div>
                    ) : (
                      <input type="text" value={customValues[field.id] ?? ''}
                        onChange={e => setCustomValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                        placeholder="..."
                        className="w-full px-3 py-2 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Photo upload */}
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-2">Фотоотчёт</p>
              <input type="file" ref={fileInputRef} onChange={handleUploadPhoto}
                accept="image/*" multiple className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploadingPhoto}
                className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors disabled:opacity-50">
                {uploadingPhoto ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {uploadingPhoto ? 'Загрузка...' : 'Прикрепить фото (до 10)'}
              </button>
              {uploadError && (
                <p className="text-xs text-red-500 mt-1">{uploadError}</p>
              )}
              {recentDocs.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {recentDocs.slice(0, 6).map(doc => (
                    <div key={doc.id} className="relative group">
                      {doc.mime_type?.startsWith('image/') ? (
                        <img src={doc.url} alt={doc.original_name}
                          className="w-14 h-14 rounded-lg object-cover border border-gray-200" />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center">
                          <FileText size={18} className="text-gray-400" />
                        </div>
                      )}
                    </div>
                  ))}
                  {recentDocs.length > 6 && (
                    <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-400 font-medium">
                      +{recentDocs.length - 6}
                    </div>
                  )}
                </div>
              )}
            </div>

            <button onClick={handleCloseModalDone}
              className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
              Готово
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
