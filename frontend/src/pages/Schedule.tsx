import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  User,
  Sun,
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export default function Schedule() {
  const { scId } = useParams<{ scId: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);

  const load = () => {
    if (!scId) return;
    setLoading(true);
    api.schedule
      .get(Number(scId), weekOffset)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [scId, weekOffset]);

  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const fmtDuration = (m: number) => `${Math.floor(m / 60)}ч ${m % 60}м`;

  const weekLabel = data
    ? `${new Date(data.monday).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
      })} – ${new Date(data.sunday).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
      })} ${new Date(data.monday).getFullYear()}`
    : '';

  const getDayTotal = (member: any, dayIdx: number) => {
    const day = member.days[dayIdx];
    return day?.entries?.length
      ? day.entries.reduce((s: number, e: any) => s + (e.duration_minutes || 0), 0)
      : 0;
  };

  const getDayEntries = (member: any, dayIdx: number) => member.days[dayIdx]?.entries || [];

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
        <h1 className="text-xl font-bold text-gray-900">Расписание</h1>
      </div>

      <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
        <button
          onClick={() => setWeekOffset((p) => p - 1)}
          className="p-2 rounded-xl hover:bg-gray-50 text-gray-400 hover:text-indigo-600 transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="text-sm font-semibold text-gray-900">{weekLabel}</div>
        <button
          onClick={() => setWeekOffset((p) => p + 1)}
          className="p-2 rounded-xl hover:bg-gray-50 text-gray-400 hover:text-indigo-600 transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {data?.members?.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
          <div className="p-3 rounded-xl bg-gray-50 inline-flex mb-3">
            <Sun size={24} className="text-gray-300" />
          </div>
          <p className="text-sm text-gray-400">Нет сотрудников для отображения</p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-5">
          <div className="min-w-[640px] px-5 space-y-2">
            {data?.members?.map((member: any) => {
              const weekTotal = member.days?.reduce(
                (s: number, d: any) => s + (d.total_minutes || 0), 0
              ) || 0;

              return (
                <div
                  key={member.member_id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                >
                  <Link
                    to={`/centers/${scId}/employees/${member.member_id}`}
                    className="flex items-center gap-2 px-4 py-3 bg-gray-50/50 hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                      <User size={14} className="text-indigo-600" />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 truncate">
                      {member.user.full_name}
                    </span>
                    {member.shift && (
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: member.shift.color + '20',
                          color: member.shift.color,
                        }}
                      >
                        {member.shift.name}
                      </span>
                    )}
                    <span className="ml-auto text-xs font-medium text-indigo-600 whitespace-nowrap">
                      {fmtDuration(weekTotal)}
                    </span>
                  </Link>

                  <div className="grid grid-cols-7 border-t border-gray-50">
                    {WEEKDAYS.map((_, dayIdx) => {
                      const entries = getDayEntries(member, dayIdx);
                      const total = getDayTotal(member, dayIdx);
                      const isToday = member.days?.[dayIdx]?.date === new Date().toISOString().slice(0, 10);

                      return (
                        <div
                          key={dayIdx}
                          className={`min-h-[60px] p-2 border-r border-gray-50 last:border-r-0 ${
                            isToday ? 'bg-indigo-50/30' : ''
                          }`}
                        >
                          <div className="flex items-center justify-center mb-1">
                            <span className={`text-[10px] font-medium ${
                              isToday ? 'text-indigo-600' : 'text-gray-400'
                            }`}>
                              {WEEKDAYS[dayIdx]}
                            </span>
                          </div>
                          {entries.length > 0 ? (
                            <div className="space-y-0.5">
                              {entries.map((e: any) => (
                                <div
                                  key={e.id}
                                  className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-center leading-tight"
                                >
                                  {fmtTime(e.clock_in)}
                                  {e.clock_out && `–${fmtTime(e.clock_out)}`}
                                </div>
                              ))}
                              <div className="text-[9px] text-center text-gray-400 font-medium pt-0.5">
                                {fmtDuration(total)}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <span className="text-[10px] text-gray-200">–</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="text-center text-xs text-gray-300 pb-2">
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded bg-indigo-50 border border-indigo-200" />
          {' '}сегодня
        </span>
      </div>
    </div>
  );
}
