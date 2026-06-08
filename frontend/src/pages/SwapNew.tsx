import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import {
  ArrowRightLeft,
  Building2,
  User,
  Calendar,
  FileText,
  AlertCircle,
  CheckCircle2,
  Zap,
  ArrowRight,
  Users,
} from 'lucide-react';

function formatTime(entry: any) {
  if (entry.type === 'full_day' || !entry.start_time) return 'Весь день';
  return `${entry.start_time?.slice(0, 5) || '??'}-${entry.end_time?.slice(0, 5) || '??'}`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' });
}

function formatLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function SwapNew() {
  const navigate = useNavigate();
  const { user, isOwner, isAdmin } = useAuth();
  const [centers, setCenters] = useState<any[]>([]);
  const [otherCenters, setOtherCenters] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [allEntries, setAllEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const [scId, setScId] = useState('');
  const [swapType, setSwapType] = useState<'swap' | 'give' | 'substitution'>('swap');
  const [sourceEntryId, setSourceEntryId] = useState('');
  const [targetCenterId, setTargetCenterId] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const [targetEntryId, setTargetEntryId] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [availableDatesLoading, setAvailableDatesLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [centersLoaded, setCentersLoaded] = useState(false);
  const [entriesLoaded, setEntriesLoaded] = useState(false);
  const [otherCentersLoaded, setOtherCentersLoaded] = useState(false);

  const availableCenters = useMemo(
    () => centers.filter((c: any) => isOwner || ['owner', 'admin', 'member'].includes(c.role)),
    [centers, isOwner],
  );

  // load user's centers
  useEffect(() => {
    api.serviceCenters.list().then((cs) => {
      setCenters(cs);
      setCentersLoaded(true);
    }).catch(() => setCentersLoaded(true));
  }, []);

  // auto-select first center
  useEffect(() => {
    if (centersLoaded && !scId && availableCenters.length > 0) {
      setScId(String(availableCenters[0].id));
    }
  }, [centersLoaded, availableCenters]);

  // load other centers for substitution
  useEffect(() => {
    if (!swapType || !scId) { setOtherCenters([]); setOtherCentersLoaded(true); return; }
    if (swapType !== 'substitution') { setOtherCenters([]); setOtherCentersLoaded(true); return; }
    setOtherCentersLoaded(false);
    api.serviceCenters.other().then((cs) => {
      // exclude the source center itself
      setOtherCenters(cs.filter((c: any) => c.id !== Number(scId)));
    }).catch(() => setOtherCenters([]))
    .finally(() => setOtherCentersLoaded(true));
  }, [swapType, scId]);

  // load members + entries when scId changes
  useEffect(() => {
    if (!scId) { setMembers([]); setAllEntries([]); return; }
    setEntriesLoaded(false);
    setSourceEntryId(''); setTargetUserId(''); setTargetEntryId(''); setTargetDate('');
    (async () => {
      try {
        const [ms, entries] = await Promise.all([
          api.members.list(Number(scId)),
          isOwner || isAdmin ? api.schedule.admin({ service_center_id: Number(scId) })
                  : api.schedule.myGrouped(Number(scId)),
        ]);
        setMembers(ms.filter((m: any) => m.is_active !== false));
        const flat = Array.isArray(entries)
          ? entries.flatMap((g: any) => g.entries || [])
          : Object.values(entries as Record<string, any[]>).flat();
        setAllEntries(flat.filter((e: any) => new Date(e.date) >= new Date()));
      } catch { setMembers([]); setAllEntries([]); }
      finally { setEntriesLoaded(true); }
    })();
  }, [scId]);

  useEffect(() => {
    if (centersLoaded && (!scId || entriesLoaded) && otherCentersLoaded) {
      setLoading(false);
    }
  }, [centersLoaded, entriesLoaded, otherCentersLoaded, scId]);

  // load target members when targetCenterId changes (for substitution)
  const targetMembers = useMemo(() => {
    if (!targetCenterId || swapType !== 'substitution') return [];
    const center = otherCenters.find((c: any) => String(c.id) === targetCenterId);
    return center?.members?.filter((m: any) => m.is_active !== false) || [];
  }, [otherCenters, targetCenterId, swapType]);

  // my entries (source)
  const myEntries = useMemo(
    () => allEntries.filter((e: any) => Number(e.user_id) === Number(user?.id)),
    [allEntries, user],
  );

  const sourceEntries = useMemo(
    () => isOwner || isAdmin ? allEntries : myEntries,
    [isOwner, isAdmin, allEntries, myEntries],
  );

  const selectedSource = useMemo(
    () => allEntries.find((e: any) => e.id === Number(sourceEntryId)),
    [allEntries, sourceEntryId],
  );

  // target candidates for same-center swap/give
  const targetCandidates = useMemo(() => {
    const sourceUid = selectedSource?.user_id || user?.id;
    return members.filter((m: any) => Number(m.user_id) !== Number(sourceUid));
  }, [members, selectedSource, user]);

  const selectedTargetMember = useMemo(
    () => members.find((m: any) => String(m.user_id) === targetUserId) ||
          targetMembers.find((m: any) => String(m.user_id) === targetUserId),
    [members, targetMembers, targetUserId],
  );

  // target entries for selected target user (same-center swap)
  const targetEntries = useMemo(
    () => allEntries.filter((e: any) => String(e.user_id) === targetUserId),
    [allEntries, targetUserId],
  );

  // auto-select target entry on same date as source
  useEffect(() => {
    if (!targetUserId || !selectedSource || swapType !== 'swap') { setTargetEntryId(''); return; }
    const sameDate = targetEntries.find((e: any) => e.date === selectedSource.date);
    if (sameDate) {
      setTargetEntryId(String(sameDate.id));
    } else {
      setTargetEntryId('');
    }
  }, [targetUserId, selectedSource, swapType]);

  // fetch available dates for substitution target
  useEffect(() => {
    if (swapType !== 'substitution' || !targetUserId || !targetCenterId || !sourceEntryId) {
      setAvailableDates([]);
      setTargetDate('');
      return;
    }
    setAvailableDatesLoading(true);
    const from = formatLocal(new Date());
    const to = formatLocal(new Date(Date.now() + 90 * 86400000));
    api.schedule.availableDates(Number(targetUserId), from, to)
      .then((dates) => setAvailableDates(dates))
      .catch(() => setAvailableDates([]))
      .finally(() => setAvailableDatesLoading(false));
  }, [swapType, targetUserId, targetCenterId, sourceEntryId]);

  // validation
  const canSubmit = scId && sourceEntryId && !saving && (
    swapType === 'swap' ? (targetUserId && targetEntryId) :
    swapType === 'substitution' ? (targetCenterId && targetUserId && targetDate) :
    swapType === 'give' ? targetUserId : false
  );

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true); setMessage(''); setConfirmOpen(false);
    try {
      const payload: any = {
        service_center_id: Number(scId),
        source_entry_id: Number(sourceEntryId),
        source_user_id: Number(selectedSource?.user_id || user?.id),
        source_date: selectedSource?.date || '',
        target_user_id: targetUserId ? Number(targetUserId) : undefined,
        swap_type: swapType,
        notes: notes || undefined,
      };
      if (swapType === 'swap') {
        payload.target_entry_id = targetEntryId ? Number(targetEntryId) : undefined;
      }
      if (swapType === 'substitution') {
        payload.target_center_id = Number(targetCenterId);
        payload.target_date = targetDate;
      }
      await api.swaps.create(payload);
      setIsSuccess(true);
      setMessage('Запрос создан!');
      setTimeout(() => navigate('/swaps'), 1500);
    } catch (err: any) {
      setIsSuccess(false);
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const typeLabels: Record<string, string> = {
    swap: 'Обмен сменами',
    give: 'Передача смены',
    substitution: 'Подмена с других складов',
  };

  return (
    <div className="space-y-5 pb-8">
      <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
        {typeLabels[swapType]}
      </h1>

      {/* Step 1: Center */}
      <section className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)' }}>
        <label className="flex items-center gap-1.5 text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
          <Building2 size={13} /> Склад
        </label>
        <select value={scId} onChange={(e) => setScId(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-colors"
          style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
          <option value="">Выберите центр</option>
          {availableCenters.map((c: any) => (
            <option key={c.id} value={c.id}>{c.address ? `${c.name} (${c.address})` : c.name}</option>
          ))}
        </select>
      </section>

      {/* Step 2: Type */}
      <section className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)' }}>
        <label className="flex items-center gap-1.5 text-xs font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
          <ArrowRightLeft size={13} /> Тип
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button type="button" onClick={() => { setSwapType('swap'); setTargetEntryId(''); setTargetCenterId(''); setTargetDate(''); }}
            className="flex flex-col items-center gap-1.5 p-3.5 rounded-xl text-sm font-medium transition-all border"
            style={{
              backgroundColor: swapType === 'swap' ? 'var(--accent-bg)' : 'var(--bg-primary)',
              borderColor: swapType === 'swap' ? 'var(--accent)' : 'var(--border)',
              color: swapType === 'swap' ? 'var(--accent)' : 'var(--text-secondary)',
            }}>
            <ArrowRightLeft size={20} />
            <span className="font-semibold">Обмен</span>
            <span className="text-[10px] opacity-70">Я ↔ Сотрудник</span>
          </button>
          <button type="button" onClick={() => { setSwapType('give'); setTargetEntryId(''); setTargetCenterId(''); setTargetDate(''); }}
            className="flex flex-col items-center gap-1.5 p-3.5 rounded-xl text-sm font-medium transition-all border"
            style={{
              backgroundColor: swapType === 'give' ? 'var(--accent-bg)' : 'var(--bg-primary)',
              borderColor: swapType === 'give' ? 'var(--accent)' : 'var(--border)',
              color: swapType === 'give' ? 'var(--accent)' : 'var(--text-secondary)',
            }}>
            <Zap size={20} />
            <span className="font-semibold">Передать</span>
            <span className="text-[10px] opacity-70">Я → Сотруднику</span>
          </button>
          <button type="button" onClick={() => { setSwapType('substitution'); setTargetEntryId(''); setTargetUserId(''); setTargetCenterId(''); setTargetDate(''); }}
            className="flex flex-col items-center gap-1.5 p-3.5 rounded-xl text-sm font-medium transition-all border"
            style={{
              backgroundColor: swapType === 'substitution' ? 'var(--accent-bg)' : 'var(--bg-primary)',
              borderColor: swapType === 'substitution' ? 'var(--accent)' : 'var(--border)',
              color: swapType === 'substitution' ? 'var(--accent)' : 'var(--text-secondary)',
            }}>
            <Users size={20} />
            <span className="font-semibold">Подмена</span>
            <span className="text-[10px] opacity-70">Другой склад</span>
          </button>
        </div>
      </section>

      {/* Step 3: My shift */}
      <section className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)' }}>
        <label className="flex items-center gap-1.5 text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
          <Calendar size={13} /> {isOwner || isAdmin ? 'Чья смена' : 'Моя смена'}
        </label>
        {sourceEntries.length === 0 ? (
          <p className="text-sm py-3 text-center" style={{ color: 'var(--text-disabled)' }}>
            Нет предстоящих смен
          </p>
        ) : (
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {sourceEntries.map((e: any) => (
              <button key={e.id} type="button" onClick={() => setSourceEntryId(String(e.id))}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all border"
                style={{
                  backgroundColor: sourceEntryId === String(e.id) ? 'var(--accent-bg)' : 'var(--bg-primary)',
                  borderColor: sourceEntryId === String(e.id) ? 'var(--accent)' : 'var(--border)',
                }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                  {new Date(e.date).getDate()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {formatDate(e.date)}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {formatTime(e)}
                    {(isOwner || isAdmin) && e.user_name && ` · ${e.user_name}`}
                  </p>
                </div>
                {sourceEntryId === String(e.id) && (
                  <CheckCircle2 size={18} style={{ color: 'var(--accent)' }} />
                )}
              </button>
            ))}
          </div>
        )}
      </section>

      {selectedSource && (
        <>
          {/* Step 4: Target center (substitution only) */}
          {swapType === 'substitution' && (
            <section className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)' }}>
              <label className="flex items-center gap-1.5 text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                <Building2 size={13} /> Другой склад
              </label>
              {otherCenters.length === 0 ? (
                <p className="text-sm py-3 text-center" style={{ color: 'var(--text-disabled)' }}>
                  Нет других складов того же владельца
                </p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {otherCenters.map((c: any) => (
                    <button key={c.id} type="button" onClick={() => { setTargetCenterId(String(c.id)); setTargetUserId(''); setTargetDate(''); }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all border"
                      style={{
                        backgroundColor: targetCenterId === String(c.id) ? 'var(--accent-bg)' : 'var(--bg-primary)',
                        borderColor: targetCenterId === String(c.id) ? 'var(--accent)' : 'var(--border)',
                      }}>
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
                        style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                        <Building2 size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                          {c.address ? `${c.name} (${c.address})` : c.name}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {c.members?.length || 0} сотрудников
                        </p>
                      </div>
                      {targetCenterId === String(c.id) && (
                        <CheckCircle2 size={18} style={{ color: 'var(--accent)' }} />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Step 5: Target employee */}
          {(swapType === 'swap' || swapType === 'give') && (
            <section className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)' }}>
              <label className="flex items-center gap-1.5 text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                <User size={13} /> {swapType === 'swap' ? 'Сотрудник для обмена' : 'Кому передать'}
              </label>
              {targetCandidates.length === 0 ? (
                <p className="text-sm py-3 text-center" style={{ color: 'var(--text-disabled)' }}>
                  Нет других сотрудников
                </p>
              ) : (
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {targetCandidates.map((m: any) => {
                    const tEntries = allEntries.filter((e: any) => String(e.user_id) === String(m.user_id));
                    return (
                      <button key={m.user_id} type="button" onClick={() => setTargetUserId(String(m.user_id))}
                        className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all border"
                        style={{
                          backgroundColor: targetUserId === String(m.user_id) ? 'var(--accent-bg)' : 'var(--bg-primary)',
                          borderColor: targetUserId === String(m.user_id) ? 'var(--accent)' : 'var(--border)',
                        }}>
                        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                          style={{ backgroundColor: m.user?.color ? m.user.color + '30' : 'var(--bg-tertiary)', color: m.user?.color || 'var(--text-secondary)' }}>
                          {m.user?.full_name?.[0] || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                            {m.user?.full_name || 'Неизвестно'}
                          </p>
                          {tEntries.length > 0 && (
                            <p className="text-xs truncate" style={{ color: 'var(--text-disabled)' }}>
                              {tEntries.length} смен{tEntries.length > 1 ? '' : 'а'} · {formatDate(tEntries[0].date)}
                              {tEntries.length > 1 ? ` + ещё ${tEntries.length - 1}` : ''}
                            </p>
                          )}
                        </div>
                        {targetUserId === String(m.user_id) && (
                          <CheckCircle2 size={18} style={{ color: 'var(--accent)' }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {swapType === 'substitution' && targetCenterId && (
            <section className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)' }}>
              <label className="flex items-center gap-1.5 text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                <User size={13} /> Сотрудник для подмены
              </label>
              {targetMembers.length === 0 ? (
                <p className="text-sm py-3 text-center" style={{ color: 'var(--text-disabled)' }}>
                  Нет сотрудников в этом центре
                </p>
              ) : (
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {targetMembers.map((m: any) => (
                    <button key={m.user_id} type="button" onClick={() => { setTargetUserId(String(m.user_id)); setTargetDate(''); }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all border"
                      style={{
                        backgroundColor: targetUserId === String(m.user_id) ? 'var(--accent-bg)' : 'var(--bg-primary)',
                        borderColor: targetUserId === String(m.user_id) ? 'var(--accent)' : 'var(--border)',
                      }}>
                      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                        style={{ backgroundColor: m.user?.color ? m.user.color + '30' : 'var(--bg-tertiary)', color: m.user?.color || 'var(--text-secondary)' }}>
                        {m.user?.full_name?.[0] || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                          {m.user?.full_name || 'Неизвестно'}
                        </p>
                      </div>
                      {targetUserId === String(m.user_id) && (
                        <CheckCircle2 size={18} style={{ color: 'var(--accent)' }} />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Step 6: Target entry (for swap type) */}
          {swapType === 'swap' && targetUserId && (
            <section className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)' }}>
              <label className="flex items-center gap-1.5 text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                <Calendar size={13} /> Смена {selectedTargetMember?.user?.full_name || 'сотрудника'}
              </label>
              {targetEntries.length === 0 ? (
                <p className="text-sm py-3 text-center" style={{ color: 'var(--text-disabled)' }}>
                  У сотрудника нет предстоящих смен
                </p>
              ) : (
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {targetEntries.map((e: any) => (
                    <button key={e.id} type="button" onClick={() => setTargetEntryId(String(e.id))}
                      className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all border"
                      style={{
                        backgroundColor: targetEntryId === String(e.id) ? 'var(--accent-bg)' : 'var(--bg-primary)',
                        borderColor: targetEntryId === String(e.id) ? 'var(--accent)' : 'var(--border)',
                      }}>
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
                        style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                        {new Date(e.date).getDate()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                          {formatDate(e.date)}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {formatTime(e)}
                        </p>
                      </div>
                      {targetEntryId === String(e.id) && (
                        <CheckCircle2 size={18} style={{ color: 'var(--accent)' }} />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Step 7: Available dates (for substitution type) */}
          {swapType === 'substitution' && targetUserId && (
            <section className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)' }}>
              <label className="flex items-center gap-1.5 text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                <Calendar size={13} /> Выходные дни {selectedTargetMember?.user?.full_name || 'сотрудника'}
              </label>
              {availableDatesLoading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : availableDates.length === 0 ? (
                <p className="text-sm py-3 text-center" style={{ color: 'var(--text-disabled)' }}>
                  Нет свободных дней в ближайшие 3 месяца
                </p>
              ) : (
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {availableDates.map((ds: string) => (
                    <button key={ds} type="button" onClick={() => setTargetDate(ds)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all border"
                      style={{
                        backgroundColor: targetDate === ds ? 'var(--accent-bg)' : 'var(--bg-primary)',
                        borderColor: targetDate === ds ? 'var(--accent)' : 'var(--border)',
                      }}>
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
                        style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                        {new Date(ds).getDate()}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {formatDate(ds)}
                        </p>
                      </div>
                      {targetDate === ds && (
                        <CheckCircle2 size={18} style={{ color: 'var(--accent)' }} />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Summary */}
          {(swapType !== 'substitution' ? (sourceEntryId && (!targetUserId || swapType !== 'swap' || targetEntryId))
                                        : (sourceEntryId && targetCenterId && targetUserId && targetDate)) && (
            <section className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)' }}>
              <label className="flex items-center gap-1.5 text-xs font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
                <CheckCircle2 size={13} /> Предпросмотр
              </label>
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-primary)' }}>
                <div className="flex-1 text-center min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {selectedSource?.user_name || user?.full_name}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {selectedSource ? formatDate(selectedSource.date) : ''}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>
                    {selectedSource ? formatTime(selectedSource) : ''}
                  </p>
                </div>
                {swapType === 'swap' ? (
                  <>
                    <ArrowRightLeft size={20} style={{ color: 'var(--accent)' }} className="shrink-0" />
                    <div className="flex-1 text-center min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {selectedTargetMember?.user?.full_name}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        {targetEntries.find((e: any) => String(e.id) === targetEntryId)
                          ? formatDate(targetEntries.find((e: any) => String(e.id) === targetEntryId)!.date)
                          : ''}
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>
                        {targetEntries.find((e: any) => String(e.id) === targetEntryId)
                          ? formatTime(targetEntries.find((e: any) => String(e.id) === targetEntryId)!)
                          : ''}
                      </p>
                    </div>
                  </>
                ) : swapType === 'substitution' ? (
                  <>
                    <ArrowRight size={20} style={{ color: 'var(--accent)' }} className="shrink-0" />
                    <div className="flex-1 text-center min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {selectedTargetMember?.user?.full_name || 'Не выбран'}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        {targetDate ? formatDate(targetDate) : ''} (выходной)
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <ArrowRight size={20} style={{ color: 'var(--accent)' }} className="shrink-0" />
                    <div className="flex-1 text-center min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {selectedTargetMember?.user?.full_name || 'Не выбран'}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        Получает эту смену
                      </p>
                    </div>
                  </>
                )}
              </div>
            </section>
          )}

          {/* Notes */}
          <section className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)' }}>
            <label className="flex items-center gap-1.5 text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              <FileText size={13} /> Комментарий
            </label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              placeholder="Пояснение для сотрудника (необязательно)"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none resize-none transition-colors"
              style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
          </section>

          {/* Validation hints */}
          {swapType === 'swap' && targetUserId && targetEntries.length === 0 && (
            <div className="flex items-start gap-2 p-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--warning-bg)', color: 'var(--warning)' }}>
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>У выбранного сотрудника нет предстоящих смен. Попробуйте тип «Передать»</span>
            </div>
          )}
          {swapType === 'swap' && !targetUserId && sourceEntryId && (
            <div className="flex items-center gap-2 p-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
              <ArrowRight size={14} />
              <span>Выберите сотрудника для обмена</span>
            </div>
          )}
          {swapType === 'swap' && targetUserId && targetEntries.length > 0 && !targetEntryId && (
            <div className="flex items-center gap-2 p-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--warning-bg)', color: 'var(--warning)' }}>
              <AlertCircle size={14} />
              <span>Выберите смену сотрудника для обмена</span>
            </div>
          )}
          {swapType === 'substitution' && !targetCenterId && (
            <div className="flex items-center gap-2 p-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
              <ArrowRight size={14} />
              <span>Выберите другой склад</span>
            </div>
          )}
          {swapType === 'substitution' && targetCenterId && !targetUserId && (
            <div className="flex items-center gap-2 p-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
              <ArrowRight size={14} />
              <span>Выберите сотрудника для подмены</span>
            </div>
          )}
          {swapType === 'substitution' && targetUserId && availableDates.length > 0 && !targetDate && (
            <div className="flex items-center gap-2 p-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--warning-bg)', color: 'var(--warning)' }}>
              <AlertCircle size={14} />
              <span>Выберите выходной день сотрудника</span>
            </div>
          )}
        </>
      )}

      {/* Message */}
      {message && (
        <div className="flex items-center gap-2 text-sm p-3 rounded-xl"
          style={{
            backgroundColor: isSuccess ? 'var(--success-bg)' : 'var(--error-bg)',
            color: isSuccess ? 'var(--success)' : 'var(--error)',
          }}>
          {isSuccess ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {message}
        </div>
      )}

      {/* Submit */}
      {selectedSource && canSubmit && (
        <button onClick={() => setConfirmOpen(true)} disabled={saving}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
          {saving ? 'Создание...' : swapType === 'swap' ? 'Отправить запрос на обмен'
                     : swapType === 'substitution' ? 'Запросить подмену'
                     : 'Передать смену'}
        </button>
      )}

      {/* Confirm dialog */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-modal-overlay"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-sm p-5 rounded-2xl animate-pop-in" style={{ backgroundColor: 'var(--bg-card)' }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              Подтвердите действие
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              {swapType === 'swap'
                ? `Смена ${selectedSource ? formatDate(selectedSource.date) : ''} будет предложена сотруднику ${selectedTargetMember?.user?.full_name || ''} для обмена.`
                : swapType === 'substitution'
                ? `Смена ${selectedSource ? formatDate(selectedSource.date) : ''} будет предложена сотруднику ${selectedTargetMember?.user?.full_name || ''} из другого склада для подмены в его выходной день (${targetDate ? formatDate(targetDate) : ''}).`
                : `Смена ${selectedSource ? formatDate(selectedSource.date) : ''} будет передана сотруднику ${selectedTargetMember?.user?.full_name || ''}.`}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
                Отмена
              </button>
              <button onClick={handleSubmit} disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
                {saving ? '...' : 'Подтвердить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
