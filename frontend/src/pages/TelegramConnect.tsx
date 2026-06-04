import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTelegram } from '../contexts/useTelegram';
import { api } from '../api/client';
import { CheckCircle, Loader2, Smartphone, LogIn } from 'lucide-react';

export default function TelegramConnect() {
  const { user } = useAuth();
  const { tgUser, initData, ready } = useTelegram();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [error, setError] = useState('');

  const doConnect = useCallback(async () => {
    if (!ready || !user || (!tgUser && !initData)) return;
    setStatus('connecting');
    const body: Record<string, unknown> = {};
    if (initData) {
      body.init_data = initData;
    } else if (tgUser) {
      body.telegram_id = tgUser.id;
      body.telegram_username = tgUser.username || '';
    }

    try {
      await api.post('/telegram/connect', body);
      setStatus('connected');
      api.invalidate('/auth/me');
    } catch (err: unknown) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [ready, user, tgUser, initData]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { doConnect(); }, [doConnect]);

  if (!ready) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80dvh] px-4">
        <Loader2 size={32} className="animate-spin text-indigo-500 mb-4" />
        <p className="text-sm text-gray-400">Загрузка...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80dvh] px-4">
        <Smartphone size={48} className="text-indigo-500 mb-4" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">Привязка Telegram</h1>
        <p className="text-sm text-gray-400 text-center mb-6">
          Войдите или зарегистрируйтесь, чтобы привязать Telegram аккаунт
        </p>
        <button
          onClick={() => navigate('/login')}
          className="bg-indigo-600 text-white py-2.5 px-6 rounded-xl font-medium text-sm hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <LogIn size={16} />
          Войти
        </button>
        <button
          onClick={() => navigate('/register')}
          className="mt-2 text-indigo-600 hover:underline text-sm font-medium"
        >
          Зарегистрироваться
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80dvh] px-4">
      {status === 'connecting' && (
        <>
          <Loader2 size={48} className="animate-spin text-indigo-500 mb-4" />
          <p className="text-sm text-gray-400">Привязываем Telegram...</p>
        </>
      )}
      {status === 'connected' && (
        <>
          <CheckCircle size={48} className="text-green-500 mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Telegram привязан!</h1>
          <p className="text-sm text-gray-400 text-center mb-6">
            Вы будете получать уведомления в Telegram.
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-indigo-600 text-white py-2.5 px-6 rounded-xl font-medium text-sm hover:bg-indigo-700 transition-colors"
          >
            Перейти в приложение
          </button>
        </>
      )}
      {status === 'error' && (
        <>
          <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mb-4">
            <Smartphone size={28} className="text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Ошибка</h1>
          <p className="text-sm text-red-500 text-center mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-gray-200 text-gray-700 py-2.5 px-6 rounded-xl font-medium text-sm hover:bg-gray-300 transition-colors"
          >
            На главную
          </button>
        </>
      )}
      {status === 'idle' && (
        <>
          <Smartphone size={48} className="text-gray-300 mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Привязка Telegram</h1>
          <p className="text-sm text-gray-400 text-center">
            Откройте эту страницу через бота в Telegram.
          </p>
        </>
      )}
    </div>
  );
}
