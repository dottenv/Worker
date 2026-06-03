import { useEffect, useRef, useState, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Download, Trash2 } from 'lucide-react';

interface DocItem {
  id: number;
  original_name: string;
  mime_type: string;
  url: string;
}

interface PhotoLightboxProps {
  docs: DocItem[];
  initialIndex: number;
  onClose: () => void;
  onDelete?: (docId: number) => void;
}

export default function PhotoLightbox({ docs, initialIndex, onClose, onDelete }: PhotoLightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const current = docs[index];
  const isImage = current?.mime_type?.startsWith('image/');
  const isFirst = index === 0;
  const isLast = index === docs.length - 1;

  const goNext = useCallback(() => {
    if (!isLast) setIndex(i => i + 1);
  }, [isLast]);

  const goPrev = useCallback(() => {
    if (!isFirst) setIndex(i => i - 1);
  }, [isFirst]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, goNext, goPrev]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext();
      else goPrev();
    }
  };

  const handleDownload = () => {
    if (current) window.open(current.url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-30 bg-black/90 flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <button onClick={onClose} className="p-2 text-white/80 hover:text-white transition-colors">
          <X size={24} />
        </button>
        <span className="text-sm text-white/70">
          {index + 1} / {docs.length}
        </span>
        <div className="flex items-center gap-1">
          <button onClick={handleDownload} className="p-2 text-white/80 hover:text-white transition-colors"
            title="Скачать">
            <Download size={20} />
          </button>
          {onDelete && (
            <button onClick={() => onDelete(current.id)} className="p-2 text-red-400 hover:text-red-300 transition-colors"
              title="Удалить">
              <Trash2 size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center relative px-4">
        {!isFirst && (
          <button onClick={goPrev}
            className="absolute left-2 p-2 text-white/60 hover:text-white transition-colors z-10">
            <ChevronLeft size={32} />
          </button>
        )}

        {isImage ? (
          <img src={current.url} alt={current.original_name}
            className="max-w-full max-h-full object-contain rounded-lg select-none"
            draggable={false} />
        ) : (
          <div className="flex flex-col items-center gap-4 text-white/70">
            <div className="w-24 h-24 rounded-2xl bg-white/10 flex items-center justify-center">
              <Download size={40} />
            </div>
            <p className="text-sm font-medium">{current.original_name}</p>
            <button onClick={handleDownload}
              className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-sm transition-colors">
              <Download size={16} />
              Скачать
            </button>
          </div>
        )}

        {!isLast && (
          <button onClick={goNext}
            className="absolute right-2 p-2 text-white/60 hover:text-white transition-colors z-10">
            <ChevronRight size={32} />
          </button>
        )}
      </div>

      {/* Dots */}
      <div className="flex items-center justify-center gap-1.5 py-3 shrink-0">
        {docs.map((_, i) => (
          <button key={i} onClick={() => setIndex(i)}
            className={`w-1.5 h-1.5 rounded-full transition-all ${
              i === index ? 'bg-white w-3' : 'bg-white/40'
            }`} />
        ))}
      </div>
    </div>
  );
}
