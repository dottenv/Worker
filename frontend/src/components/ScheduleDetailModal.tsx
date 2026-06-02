import { Link } from 'react-router-dom';
import { X, Building2, User, Calendar, Clock, DollarSign, FileText, UserCircle } from 'lucide-react';

interface Props {
  entry: any;
  onClose: () => void;
  onDelete?: (id: number) => void;
}

const TYPE_LABELS: Record<string, string> = {
  full_day: 'Весь день',
  hourly: 'По часам',
};

export default function ScheduleDetailModal({ entry, onClose, onDelete }: Props) {
  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40 animate-modal-overlay" onClick={onClose} />
      <div className="fixed inset-x-4 bottom-0 z-50 sm:inset-x-auto sm:max-w-md sm:mx-auto sm:top-1/2 sm:-translate-y-1/2">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-slide-up">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h2 className="text-base font-bold text-gray-900">Детали смены</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>

          <div className="px-5 pb-5 space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="p-2 bg-indigo-100 rounded-xl">
                <Calendar size={18} className="text-indigo-600" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  {new Date(entry.date).toLocaleDateString('ru-RU', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </div>
                <div className={`text-xs font-medium mt-0.5 ${entry.type === 'full_day' ? 'text-blue-600' : 'text-purple-600'}`}>
                  {TYPE_LABELS[entry.type] || entry.type}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-emerald-50 rounded-lg shrink-0">
                  <Building2 size={14} className="text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Склад</div>
                  <div className="text-sm font-medium text-gray-900 truncate">{entry.service_center_address ? `${entry.service_center_name} (${entry.service_center_address})` : entry.service_center_name}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-blue-50 rounded-lg shrink-0">
                  <User size={14} className="text-blue-600" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Сотрудник</div>
                  <Link to={`/profile/${entry.user_id}`} onClick={(e) => e.stopPropagation()} className="text-sm font-medium text-indigo-600 hover:text-indigo-800 truncate">{entry.user_name}</Link>
                </div>
              </div>

              {entry.type === 'hourly' && (
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-amber-50 rounded-lg shrink-0">
                    <Clock size={14} className="text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Время</div>
                    <div className="text-sm font-medium text-gray-900">
                      {entry.start_time || '—'} – {entry.end_time || '—'}
                    </div>
                  </div>
                </div>
              )}

              {entry.hourly_rate > 0 && (
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-rose-50 rounded-lg shrink-0">
                    <DollarSign size={14} className="text-rose-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Ставка</div>
                    <div className="text-sm font-medium text-gray-900">{entry.hourly_rate} ₽/ч</div>
                  </div>
                </div>
              )}

              {entry.notes && (
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-gray-100 rounded-lg shrink-0 mt-0.5">
                    <FileText size={14} className="text-gray-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Заметки</div>
                    <div className="text-sm text-gray-700">{entry.notes}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
              <UserCircle size={12} className="text-gray-300" />
              <span className="text-[10px] text-gray-400">
                {entry.created_by_name ? `Создал(а): ${entry.created_by_name}` : ''}
              </span>
            </div>

            {onDelete && (
              <button
                onClick={() => onDelete(entry.id)}
                className="w-full py-2.5 rounded-xl text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
              >
                Удалить смену
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
