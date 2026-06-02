import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import {
  ArrowRightLeft,
  CalendarPlus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  X,
} from 'lucide-react';

export default function AdminHistoryWidget() {
  const [data, setData] = useState<{ swaps: any[]; entries: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.schedule.history()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 size={20} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (!data || (data.swaps.length === 0 && data.entries.length === 0)) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
        <Clock size={24} className="text-gray-200 mx-auto mb-2" />
        <p className="text-sm text-gray-400">История изменений пуста</p>
      </div>
    );
  }

  const statusIcon = (s: string) => {
    switch (s) {
      case 'accepted': return <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />;
      case 'rejected': return <X size={14} className="text-red-500 shrink-0" />;
      case 'cancelled': return <AlertCircle size={14} className="text-gray-400 shrink-0" />;
      default: return <Clock size={14} className="text-amber-500 shrink-0" />;
    }
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case 'accepted': return 'принят';
      case 'rejected': return 'отклонён';
      case 'cancelled': return 'отменён';
      default: return 'ожидает';
    }
  };

  const items: { date: string; node: React.ReactNode }[] = [];

  for (const s of data.swaps) {
    const label = s.swap_type === 'give' ? 'Передача смены' : 'Обмен сменами';
    const detail = s.source_date?.slice(0, 10);
    items.push({
      date: s.created_at?.slice(0, 10) || '',
      node: (
        <Link to={`/swaps/${s.id}`} className="flex items-start gap-2.5 hover:opacity-80 transition-opacity">
          <div className="p-1.5 rounded-lg bg-indigo-50 shrink-0">
            <ArrowRightLeft size={14} className="text-indigo-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{label}</p>
            <p className="text-xs text-gray-400">
              {s.source_user_name} → {s.target_user_name || '—'} · {detail}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              {statusIcon(s.status)}
              <span className="text-[10px] text-gray-400">{statusLabel(s.status)}</span>
            </div>
          </div>
        </Link>
      ),
    });
  }

  for (const e of data.entries) {
    items.push({
      date: e.created_at?.slice(0, 10) || '',
      node: (
        <div className="flex items-start gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-50 shrink-0">
            <CalendarPlus size={14} className="text-emerald-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {e.user_name} · {e.date?.slice(0, 10)}
            </p>
            <p className="text-xs text-gray-400">
              {e.type === 'full_day' ? 'Весь день' : `${e.start_time || ''}–${e.end_time || ''}`}
              {e.created_by_name ? ` · добавил ${e.created_by_name}` : ''}
            </p>
          </div>
        </div>
      ),
    });
  }

  items.sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-50 flex items-center gap-2">
        <Clock size={15} className="text-gray-400" />
        <h3 className="text-sm font-semibold text-gray-900">История изменений</h3>
      </div>
      <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
        {items.slice(0, 15).map((item, i) => (
          <div key={i} className="px-5 py-2.5">
            {item.node}
          </div>
        ))}
      </div>
      <Link
        to="/swaps"
        className="flex items-center justify-center gap-1 py-2.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition-colors border-t border-gray-50"
      >
        Все обмены <ChevronRight size={12} />
      </Link>
    </div>
  );
}
