import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Palette, Grid, Bell, Copy, Check, Building2, RefreshCw, Download, AlertCircle } from 'lucide-react';
import { Cell, Section } from '../components/SettingsUI';
import { useCenters } from '../contexts/CenterContext';
import { useAuth } from '../contexts/AuthContext';
import { useSocketEvent } from '../contexts/SocketContext';
import { api } from '../api/client';

interface UpdateStatus {
  update_available: boolean;
  latest: string;
  behind: number;
  commits?: { hash: string; message: string }[];
}

interface ProgressEvent {
  message: string;
  percent: number;
}

const AUTO_CHECK_INTERVAL = 5 * 60 * 1000; // 5 минут

export default function SettingsIndex() {
  const navigate = useNavigate();
  const buildHash = import.meta.env.VITE_GIT_HASH || 'unknown';
  const [copied, setCopied] = useState(false);
  const { centers, activeCenter, setActiveCenterId } = useCenters();
  const { isSuperuser } = useAuth();
  
  // Update state
  const [checking, setChecking] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [updating, setUpdating] = useState(false);
  const [progress, setProgress] = useState<ProgressEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const progressRef = useRef<{ message: string; percent: number } | null>(null);

  const copyBuildHash = () => {
    navigator.clipboard.writeText(buildHash).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => {});
  };

  // Socket events for progress
  useSocketEvent('update:progress', (data: ProgressEvent) => {
    progressRef.current = data;
    setProgress(data);
  });

  useSocketEvent('update:error', (data: { message: string }) => {
    setUpdating(false);
    setError(data.message);
    setProgress(null);
  });

  // Check for updates manually
  const checkForUpdates = async (showLoading = true) => {
    if (!isSuperuser) return;
    if (showLoading) setChecking(true);
    setError(null);
    try {
      const status = await api.update.check(buildHash);
      setUpdateStatus(status);
    } catch (err: any) {
      setError(err.message || 'Ошибка проверки обновлений');
    } finally {
      setChecking(false);
    }
  };

  // Auto-check on mount and interval
  useEffect(() => {
    if (!isSuperuser) return;
    
    // Initial check
    checkForUpdates(false);
    
    // Auto-poll
    const interval = setInterval(() => {
      checkForUpdates(false);
    }, AUTO_CHECK_INTERVAL);
    
    return () => clearInterval(interval);
  }, [isSuperuser]);

  // Apply update
  const applyUpdate = async () => {
    if (!updateStatus?.update_available) return;
    setUpdating(true);
    setError(null);
    progressRef.current = null;
    setProgress({ message: 'Запуск обновления...', percent: 0 });
    try {
      await api.update.apply();
      // Progress will come via socket
    } catch (err: any) {
      setUpdating(false);
      setError(err.message || 'Ошибка запуска обновления');
      setProgress(null);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(buildHash).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => {});
  };

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Настройки</h1>

      <div className="relative">
        <select value={activeCenter?.id || ''} onChange={e => setActiveCenterId(Number(e.target.value))}
          className="w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 appearance-none cursor-pointer transition-colors"
          style={{
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            paddingLeft: '2.75rem',
          }}>
          {centers.map(c => (
            <option key={c.id} value={c.id}>{c.address ? `${c.name} (${c.address})` : c.name}</option>
          ))}
        </select>
        <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-secondary)' }} />
      </div>

      <Section>
        <Cell icon={User} label="Профиль" onClick={() => navigate('/settings/profile')} />
        <Cell icon={Palette} label="Приложение" onClick={() => navigate('/settings/app')} />
        <Cell icon={Grid} label="Нижняя навигация" onClick={() => navigate('/settings/navigation')} />
        <Cell icon={Bell} label="Уведомления" onClick={() => navigate('/settings/notifications')} />
      </Section>

      {/* Build & Update Section */}
      {isSuperuser && (
        <div className="space-y-3">
          <div 
            className="flex items-center justify-between p-4 rounded-2xl border"
            style={{ 
              backgroundColor: 'var(--bg-card)',
              borderColor: updateStatus?.update_available ? 'var(--accent)' : 'var(--border)'
            }}
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: updateStatus?.update_available ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-secondary)' }}
              >
                {checking ? (
                  <RefreshCw size={18} className="animate-spin" style={{ color: 'var(--text-secondary)' }} />
                ) : updateStatus?.update_available ? (
                  <Download size={18} style={{ color: 'var(--accent)' }} />
                ) : (
                  <RefreshCw size={18} style={{ color: 'var(--text-secondary)' }} />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {updateStatus?.update_available 
                    ? `Доступно обновление (${updateStatus.behind} коммит${updateStatus.behind === 1 ? '' : updateStatus.behind > 1 && updateStatus.behind < 5 ? 'а' : 'ов'})`
                    : 'Система обновлений'
                  }
                </p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {updateStatus 
                    ? `Текущая: ${buildHash} → ${updateStatus.latest}`
                    : `Сборка ${buildHash}`
                  }
                </p>
              </div>
            </div>
            
            {!updating && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => checkForUpdates()}
                  disabled={checking}
                  className="p-2 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50"
                  title="Проверить обновления"
                >
                  <RefreshCw size={16} style={{ color: 'var(--text-secondary)' }} className={checking ? 'animate-spin' : ''} />
                </button>
                {updateStatus?.update_available && (
                  <button
                    onClick={applyUpdate}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                  >
                    <Download size={14} />
                    Обновить
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Progress bar during update */}
          {updating && progress && (
            <div className="p-4 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--accent)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                  {progress.message}
                </span>
                <span className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
                  {progress.percent}%
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <div 
                  className="h-full rounded-full transition-all duration-300"
                  style={{ 
                    width: `${progress.percent}%`, 
                    backgroundColor: 'var(--accent)' 
                  }}
                />
              </div>
            </div>
          )}

          {/* Commits list if available */}
          {updateStatus?.update_available && updateStatus.commits && updateStatus.commits.length > 0 && !updating && (
            <div className="p-4 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Новые коммиты:</p>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {updateStatus.commits.slice(0, 5).map(c => (
                  <div key={c.hash} className="flex items-start gap-2 text-xs">
                    <span className="shrink-0 font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                      {c.hash}
                    </span>
                    <span className="truncate" style={{ color: 'var(--text-primary)' }}>{c.message}</span>
                  </div>
                ))}
                {updateStatus.commits.length > 5 && (
                  <p className="text-xs" style={{ color: 'var(--text-disabled)' }}>+ ещё {updateStatus.commits.length - 5}</p>
                )}
              </div>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-600 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
        </div>
      )}

      {/* Version display for non-superusers */}
      {!isSuperuser && (
        <div className="flex items-center justify-center gap-1.5 pt-2">
          <span className="text-xs" style={{ color: 'var(--text-disabled)' }}>Сборка {buildHash}</span>
          <button onClick={copyBuildHash} className="p-0.5" style={{ color: 'var(--text-disabled)' }}>
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
        </div>
      )}
    </div>
  );
}