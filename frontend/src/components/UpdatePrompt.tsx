import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

export default function UpdatePrompt() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let registration: ServiceWorkerRegistration | null = null;

    navigator.serviceWorker.ready.then((reg) => {
      registration = reg;

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setUpdateAvailable(true);
          }
        });
      });
    });

    const interval = setInterval(() => {
      registration?.update().catch(() => {});
    }, 3600000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const handleUpdate = () => {
    setUpdateAvailable(false);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.waiting?.postMessage({ type: 'SKIP_WAITING' });
      });
    }
    window.location.reload();
  };

  if (!updateAvailable) return null;

  return (
    <div className="fixed inset-x-4 bottom-20 z-50 max-w-lg mx-auto animate-slide-up">
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg border"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="p-2 rounded-xl bg-indigo-50 shrink-0">
          <RefreshCw size={18} className="text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Доступно обновление</p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Нажмите, чтобы применить</p>
        </div>
        <button
          onClick={handleUpdate}
          className="shrink-0 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          Обновить
        </button>
      </div>
    </div>
  );
}
