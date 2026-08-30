import { useEffect, useRef, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { Camera, X, Keyboard, ScanLine, CheckCircle2 } from 'lucide-react';

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
  const streamRef = useRef<MediaStream | null>(null);
  const controlsRef = useRef<any>(null);
  const handledRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'camera' | 'manual'>('camera');
  const [error, setError] = useState('');
  const [value, setValue] = useState('');

  const stop = useCallback(() => {
    try { controlsRef.current?.stop?.(); } catch { /* noop */ }
    controlsRef.current = null;
    try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch { /* noop */ }
    streamRef.current = null;
  }, []);

  useEffect(() => {
    handledRef.current = false;
    if (mode !== 'camera') { stop(); return; }
    let cancelled = false;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setError('Камера не поддерживается браузером');
          setMode('manual');
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
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (!videoRef.current) { stream.getTracks().forEach((t) => t.stop()); return; }
        const video = videoRef.current;
        video.srcObject = stream;
        try { await video.play(); } catch { /* noop */ }

        const reader = new BrowserMultiFormatReader();
        try { (reader as any).timeBetweenScansMillis = 500; } catch { /* noop */ }
        controlsRef.current = await reader.decodeFromStream(stream, video, (result: any) => {
          if (!result) return;
          const code = String(result.getText()).trim();
          if (!code) return;
          if (!continuous) {
            if (handledRef.current) return;
            handledRef.current = true;
            stop();
          }
          onResult(code);
        });
      } catch (e: any) {
        setError(e?.message || 'Не удалось запустить камеру');
        setMode('manual');
      }
    })();
    return () => { cancelled = true; stop(); };
  }, [mode, continuous, onResult, stop]);

  const submitManual = () => {
    const code = value.trim();
    if (!code) return;
    setValue('');
    if (!continuous) {
      handledRef.current = true;
      onResult(code);
    } else {
      onResult(code);
      inputRef.current?.focus();
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

        {mode === 'camera' ? (
          <div className="relative bg-black">
            <video ref={videoRef} muted playsInline className="w-full aspect-[3/4] sm:aspect-video object-cover" />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-24 w-56 rounded-md border-2 border-white/70" />
            </div>
          </div>
        ) : null}

        {error && mode === 'camera' ? (
          <div className="px-4 py-2 text-sm text-red-600 dark:text-red-400">{error}</div>
        ) : null}

        <div className="p-4 space-y-3">
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
            <button
              onClick={submitManual}
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
            >
              OK
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-slate-500 dark:text-slate-400">
              {mode === 'camera'
                ? 'Наведите камеру на штрихкод'
                : 'Внешний сканер вводит код как с клавиатуры'}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setError(''); stop(); setMode(m => m === 'camera' ? 'manual' : 'camera'); }}
                className="flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                {mode === 'camera' ? <Keyboard size={16} /> : <Camera size={16} />}
                {mode === 'camera' ? 'Вручную' : 'Камера'}
              </button>
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
    </div>
  );
}