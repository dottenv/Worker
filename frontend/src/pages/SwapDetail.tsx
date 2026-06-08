import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import {
  ArrowRightLeft,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  User,
  Building2,
  Calendar,
  FileText,
  Zap,
  CalendarDays,
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

const STATUS_CONFIG: Record<string, { label: string; icon: any; class: string }> = {
  pending: { label: 'Ожидает ответа', icon: Clock, class: 'text-amber-600 bg-amber-50' },
  accepted: { label: 'Принят', icon: CheckCircle2, class: 'text-emerald-600 bg-emerald-50' },
  rejected: { label: 'Отклонён', icon: XCircle, class: 'text-red-600 bg-red-50' },
  cancelled: { label: 'Отменён', icon: AlertCircle, class: 'text-gray-500 bg-gray-100' },
};

const TYPE_LABELS: Record<string, string> = {
  swap: 'Обмен сменами',
  give: 'Передача смены',
  force: 'Принудительный обмен',
};

export default function SwapDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isOwner, isAdmin } = useAuth();
  const [swap, setSwap] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [justCompleted, setJustCompleted] = useState(false);

  const loadSwap = async () => {
    try {
      const data = await api.swaps.get(Number(id));
      setSwap(data);
    } catch {
      navigate('/swaps', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSwap(); }, [id]);

  const isResponder = swap?.responder_id === user?.id;
  const isRequester = swap?.requester_id === user?.id;
  const isManager = isOwner || isAdmin;

  const canAccept = swap?.status === 'pending' && (isResponder || isManager);
  const canReject = swap?.status === 'pending' && (isResponder || isManager);
  const canCancel = swap?.status === 'pending' && (isRequester || isManager);
  const canForce = swap?.status === 'pending' && isManager && swap.swap_type !== 'force';

  const handleAction = async (action: 'accept' | 'reject' | 'cancel' | 'force') => {
    setActionLoading(true);
    setError('');
    try {
      const fn = {
        accept: api.swaps.accept,
        reject: api.swaps.reject,
        cancel: api.swaps.cancel,
        force: api.swaps.force,
      }[action];
      await fn(Number(id));
      await loadSwap();
      setJustCompleted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!swap) return null;

  const st = STATUS_CONFIG[swap.status] || STATUS_CONFIG.pending;
  const StatusIcon = st.icon;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Детали обмена</h1>

      {error && (
        <div className="flex items-center gap-2 text-sm p-3 rounded-xl bg-red-50 text-red-600">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${st.class}`}>
                <StatusIcon size={12} className="inline mr-1" />
                {st.label}
              </span>
              <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                {TYPE_LABELS[swap.swap_type] || swap.swap_type}
              </span>
            </div>
            <span className="text-[10px] text-gray-400">
              {new Date(swap.created_at).toLocaleDateString('ru-RU', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
              })}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
              <div className="p-2 bg-blue-100 rounded-xl">
                <User size={16} className="text-blue-600" />
              </div>
              <div>
                <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Кто отдаёт смену</div>
                <div className="text-sm font-semibold text-gray-900">{swap.source_user_name}</div>
              </div>
            </div>

            <div className="flex justify-center">
              <div className="p-1.5 rounded-full bg-indigo-100">
                <ArrowRightLeft size={14} className="text-indigo-600" />
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
              <div className="p-2 bg-emerald-100 rounded-xl">
                <User size={16} className="text-emerald-600" />
              </div>
              <div>
                <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Кто принимает смену</div>
                <div className="text-sm font-semibold text-gray-900">{swap.target_user_name || '—'}</div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4 space-y-3">
            <div className="space-y-2">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Исходная смена</div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-indigo-50">
                <Calendar size={14} className="text-indigo-500 shrink-0" />
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {new Date(swap.source_date).toLocaleDateString('ru-RU', {
                      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                    <Building2 size={10} />
                    {swap.service_center_address ? `${swap.service_center_name} (${swap.service_center_address})` : swap.service_center_name}
                  </div>
                </div>
              </div>
            </div>

            {swap.target_date && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Целевая смена</div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50">
                  <Calendar size={14} className="text-emerald-500 shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {new Date(swap.target_date).toLocaleDateString('ru-RU', {
                        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                      <Building2 size={10} />
                      {swap.target_center_address ? `${swap.target_center_name || swap.service_center_name} (${swap.target_center_address})` : (swap.target_center_name || swap.service_center_name)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {swap.notes && (
            <div className="border-t border-gray-100 pt-4">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Комментарий</div>
              <div className="flex items-start gap-2 text-sm text-gray-700 bg-gray-50 p-3 rounded-xl">
                <FileText size={14} className="text-gray-400 mt-0.5 shrink-0" />
                {swap.notes}
              </div>
            </div>
          )}

          {swap.resolved_at && (
            <div className="border-t border-gray-100 pt-4">
              <div className="text-[10px] text-gray-400">
                {swap.resolved_by_name ? `Обработал(а): ${swap.resolved_by_name}` : ''}
                {swap.resolved_at ? ` • ${new Date(swap.resolved_at).toLocaleDateString('ru-RU', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                })}` : ''}
              </div>
            </div>
          )}
        </div>
      </div>

      {(canAccept || canReject || canCancel || canForce) && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
          <p className="text-xs font-medium text-gray-500 mb-2">Действия</p>
          <div className="grid grid-cols-2 gap-2">
            {canAccept && (
              <button
                onClick={() => handleAction('accept')}
                disabled={actionLoading}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                <CheckCircle2 size={15} /> Принять
              </button>
            )}
            {canReject && (
              <button
                onClick={() => handleAction('reject')}
                disabled={actionLoading}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors"
              >
                <XCircle size={15} /> Отклонить
              </button>
            )}
            {canCancel && (
              <button
                onClick={() => handleAction('cancel')}
                disabled={actionLoading}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium bg-gray-50 text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors"
              >
                <XCircle size={15} /> Отменить
              </button>
            )}
            {canForce && (
              <button
                onClick={() => handleAction('force')}
                disabled={actionLoading}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                <Zap size={15} /> Принудительно
              </button>
            )}
          </div>
        </div>
      )}

      {justCompleted && (
        <div className="flex flex-col gap-2">
          <Link
            to="/schedule/admin"
            className="flex items-center justify-center gap-2 w-full bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <CalendarDays size={16} /> Перейти к графику
          </Link>
          <Link
            to="/swaps"
            className="flex items-center justify-center gap-2 w-full bg-white border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <ArrowRightLeft size={16} /> К списку обменов
          </Link>
        </div>
      )}

    </div>
  );
}
