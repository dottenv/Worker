import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    const installedHandler = () => setInstalled(true);
    window.addEventListener('appinstalled', installedHandler);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  if (installed || !deferredPrompt) return null;

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 max-w-lg mx-auto animate-slide-up">
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg border"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="p-2 rounded-xl bg-indigo-50 shrink-0">
          <Download size={18} className="text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Установите приложение</p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Добавить на главный экран</p>
        </div>
        <button
          onClick={handleInstall}
          className="shrink-0 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          Установить
        </button>
        <button
          onClick={() => setDeferredPrompt(null)}
          className="shrink-0 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          style={{ color: 'var(--text-secondary)' }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
