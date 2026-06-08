import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import {
  ArrowRightLeft,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ChevronRight,
  Building2,
  Calendar,
  CalendarDays,
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

const STATUS_LABELS: Record<string, { label: string; icon: any; class: string }> = {
  pending: { label: 'Ожидает', icon: Clock, class: 'text-amber-600 bg-amber-50' },
  accepted: { label: 'Принят', icon: CheckCircle2, class: 'text-emerald-600 bg-emerald-50' },
  rejected: { label: 'Отклонён', icon: XCircle, class: 'text-red-600 bg-red-50' },
  cancelled: { label: 'Отменён', icon: AlertCircle, class: 'text-gray-500 bg-gray-100' },
};

const TYPE_LABELS: Record<string, string> = {
  swap: 'Обмен',
  give: 'Передача',
  force: 'Принудительно',
};

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export default function SwapList() {
  const { isOwner, isAdmin } = useAuth();
  const [swaps, setSwaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSwaps = async () => {
    setLoading(true);
    try {
      const data = isOwner || isAdmin ? await api.swaps.admin() : await api.swaps.list();
      const now = Date.now();
      const filtered = data.filter((s: any) => {
        if (s.status === 'pending') return true;
        const created = new Date(s.created_at || s.resolved_at).getTime();
        return now - created < THREE_DAYS_MS;
      });
      setSwaps(filtered);
    } catch { setSwaps([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadSwaps(); }, [isOwner, isAdmin]);

  const sorted = [...swaps].sort(
    (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Обмен сменами</h1>
        <div className="flex items-center gap-2">
          {(isOwner || isAdmin) && (
            <Link
              to="/schedule/admin"
              className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-600 px-3 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <CalendarDays size={15} />
              <span className="hidden sm:inline">График</span>
            </Link>
          )}
          <Link
            to="/swaps/new"
            className="flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <ArrowRightLeft size={16} />
            Создать
          </Link>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : sorted.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
          <div className="p-3 rounded-xl bg-gray-50 inline-flex mb-3">
            <ArrowRightLeft size={24} className="text-gray-300" />
          </div>
          <p className="text-sm text-gray-400">Нет заявок на обмен</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((s) => {
            const st = STATUS_LABELS[s.status] || STATUS_LABELS.pending;
            const StatusIcon = st.icon;
            return (
              <Link
                key={s.id}
                to={`/swaps/${s.id}`}
                className="block bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:border-indigo-100 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${st.class}`}>
                        <StatusIcon size={10} className="inline mr-0.5" />
                        {st.label}
                      </span>
                      <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        {TYPE_LABELS[s.swap_type] || s.swap_type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-gray-900 truncate">{s.source_user_name}</span>
                      <ArrowRightLeft size={12} className="text-gray-300 shrink-0" />
                      <span className="font-medium text-gray-900 truncate">{s.target_user_name || '—'}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar size={9} />
                        {new Date(s.source_date).toLocaleDateString('ru-RU')}
                      </span>
                      {s.target_date && (
                        <span className="flex items-center gap-1">
                          <Calendar size={9} />
                          {new Date(s.target_date).toLocaleDateString('ru-RU')}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Building2 size={9} />
                        {s.service_center_address ? `${s.service_center_name} (${s.service_center_address})` : s.service_center_name}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-300 shrink-0 mt-1" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
