import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../contexts/NotificationContext';
import { X, ChevronDown } from 'lucide-react';
import { NotificationIcon } from './NotificationIcons';

export default function ToastNotifications() {
  const { toasts, dismissToast } = useNotifications();
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const handleClick = useCallback((id: number) => {
    dismissToast(id);
    navigate('/notifications');
  }, [navigate, dismissToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-[60] flex flex-col gap-2 max-w-sm mx-auto pointer-events-none">
      {toasts.map(t => {
        const isExpanded = expandedId === t.id;
        const hasLongBody = t.body && t.body.length > 80;
        return (
          <div key={t.id}
            className="pointer-events-auto flex flex-col rounded-xl shadow-xl transition-all animate-slide-down border overflow-hidden"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border)',
            }}>
            <button onClick={() => {
              if (hasLongBody) { setExpandedId(isExpanded ? null : t.id); }
              else { handleClick(t.id); }
            }}
              className="flex items-start gap-3 p-3.5 text-left w-full">
              <NotificationIcon type={t.type} size={36} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium pr-5" style={{ color: 'var(--text-primary)' }}>{t.title}</p>
                {t.body && (
                  <p className={`text-xs mt-0.5 ${hasLongBody && !isExpanded ? 'line-clamp-2' : ''}`}
                    style={{ color: 'var(--text-secondary)' }}>
                    {t.body}
                  </p>
                )}
                <p className="text-[10px] mt-1" style={{ color: 'var(--accent)' }}>
                  Подробнее →
                </p>
              </div>
              <div className="flex flex-col items-center gap-1 shrink-0">
                {hasLongBody && (
                  <ChevronDown size={14} className="transition-transform"
                    style={{ color: 'var(--text-disabled)', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                )}
                <button onClick={(e) => { e.stopPropagation(); dismissToast(t.id); }}
                  className="p-0.5 rounded-full" style={{ color: 'var(--text-disabled)' }}>
                  <X size={14} />
                </button>
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
}
