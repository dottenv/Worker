import { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { Camera, X, Keyboard, ScanLine } from 'lucide-react';

interface BarcodeScannerProps {
  onResult: (code: string) => void;
  onClose: () => void;
  title?: string;
}

export default function BarcodeScanner({ onResult, onClose, title = 'Сканер штрихкода' }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<any>(null);
  const handledRef = useRef(false);
  const [mode, setMode] = useState<'camera' | 'manual'>('manual');
  const [error, setError] = useState('');
  const [value, setValue] = useState('');

  const stop = useCallback(() => {
    try { controlsRef.current?.stop?.(); } catch { /* noop */ }
    controlsRef.current = null;
  }, []);

  useEffect(() => {
    handledRef.current = false;
    if (mode !== 'camera') {
      stop();
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const reader = new BrowserMultiFormatReader();
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        const deviceId =
          devices.find((d: any) => /back|rear|environment|тыль/i.test(d.label))?.deviceId ||
          devices[0]?.deviceId;
        if (!deviceId || !videoRef.current) {
          setError('Камера не найдена');
          setMode('manual');
          return;
        }
        controlsRef.current = await reader.decodeFromVideoDevice(
          deviceId,
          videoRef.current,
          (result: any) => {
            if (result && !handledRef.current) {
              const code = String(result.getText()).trim();
              if (code) {
                handledRef.current = true;
                stop();
                onResult(code);
              }
            }
          }
        );
      } catch (e: any) {
        setError(e?.message || 'Не удалось запустить камеру');
        setMode('manual');
      }
    })();
    return () => { if (!cancelled) stop(); cancelled = true; };
  }, [mode, onResult, stop]);

  const submitManual = () => {
    const code = value.trim();
    if (!code) return;
    onResult(code);
    setValue('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 shadow-xl overflow-hidden"
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
          <div className="bg-black">
            <video ref={videoRef} className="w-full aspect-square object-cover" />
          </div>
        ) : null}

        {error && mode === 'camera' ? (
          <div className="px-4 py-2 text-sm text-red-600 dark:text-red-400">{error}</div>
        ) : null}

        <div className="p-4 space-y-3">
          <div className="flex gap-2">
            <input
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

          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400">
              {mode === 'camera'
                ? 'Наведите камеру на штрихкод'
                : 'Внешний сканер вводит код как с клавиатуры — просто отсканируйте в поле выше'}
            </span>
            <button
              onClick={() => { setError(''); setMode(m => m === 'camera' ? 'manual' : 'camera'); }}
              className="flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              {mode === 'camera' ? <Keyboard size={16} /> : <Camera size={16} />}
              {mode === 'camera' ? 'Вручную' : 'Камера'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
