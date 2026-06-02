import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../contexts/NotificationContext';
import { Bell, ChevronDown, ExternalLink, Trash2 } from 'lucide-react';
import { NotificationIcon } from '../components/NotificationIcons';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Notifications() {
  const { notifications, loading, markRead, deleteRead } = useNotifications();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggleExpand = (id: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (loading && notifications.length === 0) return <LoadingSpinner />;

  return (
    <div className="p-4 max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Уведомления
        </h1>
        <div className="flex gap-2">
          {notifications.length > 0 && (
            <button onClick={deleteRead}
              className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg"
              style={{ color: 'var(--error)', backgroundColor: 'var(--bg-tertiary)' }}>
              <Trash2 size={16} />
              Очистить
            </button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Bell size={48} style={{ color: 'var(--text-disabled)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Нет уведомлений</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {notifications.map(n => {
            const isExpanded = expanded.has(n.id);
            const hasLongBody = n.body && n.body.length > 80;
            return (
              <div key={n.id}
                className="rounded-xl transition-colors w-full overflow-hidden"
                style={{
                  backgroundColor: n.read ? 'transparent' : 'var(--bg-tertiary)',
                }}>
                <button onClick={() => { if (!n.read) markRead(n.id); toggleExpand(n.id); }}
                  className="flex items-start gap-3 p-3 text-left w-full">
                  <NotificationIcon type={n.type} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{n.title}</p>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: 'var(--accent)' }} />
                      )}
                    </div>
                    {n.body && (
                      <p className={`text-xs mt-0.5 ${hasLongBody && !isExpanded ? 'line-clamp-2' : ''}`}
                        style={{ color: 'var(--text-secondary)' }}>
                        {n.body}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>
                        {new Date(n.created_at).toLocaleString('ru-RU', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                  <ChevronDown size={16} className="mt-1 shrink-0 transition-transform"
                    style={{
                      color: 'var(--text-disabled)',
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    }} />
                </button>

                {isExpanded && (
                  <div className="px-3 pb-3 pt-0 space-y-2">
                    {n.link && (
                      <button onClick={() => { if (n.link) navigate(n.link); }}
                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg"
                        style={{ color: 'var(--accent)', backgroundColor: 'var(--accent-bg)' }}>
                        <ExternalLink size={12} /> Открыть
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
