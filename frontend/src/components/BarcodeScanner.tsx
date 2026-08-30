import { useEffect, useRef, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { Camera, X, ScanLine, Loader2, CheckCircle2, RefreshCw } from 'lucide-react';

interface BarcodeScannerProps {
  onResult: (code: string) => void;
  onClose: () => void;
  title?: string;
  continuous?: boolean;
  finishLabel?: string;
  children?: ReactNode;
}

export default function BarcodeScanner({
  onResult,
  onClose,
  title = 'Сканер штрихкода',
  continuous = false,
  finishLabel = 'Готово',
  children,
}: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const controlsRef = useRef<any>(null);
  const handledRef = useRef(false);
  const startedRef = useRef(false);

  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;
  const continuousRef = useRef(continuous);
  continuousRef.current = continuous;

  const [camState, setCamState] = useState<'idle' | 'requesting' | 'running' | 'error'>('idle');
  const [camError, setCamError] = useState('');
  const [value, setValue] = useState('');

  const stop = useCallback(() => {
    try { controlsRef.current?.stop?.(); } catch { /* noop */ }
    controlsRef.current = null;
    try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch { /* noop */ }
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    stop();
    handledRef.current = false;
    setCamError('');
    setCamState('requesting');
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCamError('Камера не поддерживается браузером. Используйте внешний сканер или ручной ввод.');
        setCamState('error');
        return;
      }
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((t) => t.stop());
        setCamState('error');
        return;
      }
      streamRef.current = stream;
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      try { await video.play(); } catch { /* noop */ }

      const reader = new BrowserMultiFormatReader();
      try { (reader as any).timeBetweenScansMillis = 500; } catch { /* noop */ }
      controlsRef.current = await reader.decodeFromStream(stream, video, (result: any) => {
        if (!result) return;
        const code = String(result.getText()).trim();
        if (!code) return;
        if (!continuousRef.current) {
          if (handledRef.current) return;
          handledRef.current = true;
          stop();
        }
        onResultRef.current(code);
      });
      setCamState('running');
    } catch (e: any) {
      setCamError(e?.message || 'Не удалось запустить камеру. Разрешите доступ в настройках браузера.');
      setCamState('error');
    }
  }, [stop]);

  useEffect(() => {
    if (!startedRef.current) { startedRef.current = true; startCamera(); }
  }, [startCamera]);

  useEffect(() => () => stop(), [stop]);

  const submitManual = () => {
    const code = value.trim();
    if (!code) return;
    setValue('');
    if (continuousRef.current) {
      onResultRef.current(code);
      inputRef.current?.focus();
    } else {
      handledRef.current = true;
      onResultRef.current(code);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-800 shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-4 py-3">
          <h3 className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100">
            <ScanLine size={18} /> {title}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {camState === 'running' ? (
            <div className="relative overflow-hidden rounded-xl bg-black">
              <video ref={videoRef} className="w-full aspect-video object-cover" />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-20 w-52 rounded-md border-2 border-white/70" />
              </div>
            </div>
          ) : camState === 'requesting' ? (
            <div className="flex h-28 items-center justify-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-sm">
              <Loader2 size={18} className="animate-spin" /> Запрашиваем доступ к камере…
            </div>
          ) : camState === 'error' ? (
            <div className="rounded-xl bg-red-50 dark:bg-red-900/30 p-3 text-sm">
              <p className="text-red-700 dark:text-red-300">{camError}</p>
              <button
                onClick={startCamera}
                className="mt-2 flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-700"
              >
                <RefreshCw size={15} /> Попробовать снова
              </button>
            </div>
          ) : (
            <button
              onClick={startCamera}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700"
            >
              <Camera size={18} /> Включить камеру
            </button>
          )}

          {children}

          <div className="flex gap-2">
            <input
              ref={inputRef}
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submitManual(); }}
              placeholder="Введите или отсканируйте штрихкод"
              className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button onClick={submitManual} className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700">
              OK
            </button>
          </div>
          <div className="text-center text-xs text-slate-400 dark:text-slate-500">
            Внешний сканер вводит код как с клавиатуры — просто отсканируйте в поле выше и нажмите Enter
          </div>

          <div className="flex items-center justify-end">
            <button
              onClick={onClose}
              className="flex items-center gap-1 rounded-lg bg-green-600 px-4 py-1.5 font-medium text-white hover:bg-green-700"
            >
              <CheckCircle2 size={16} /> {finishLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}