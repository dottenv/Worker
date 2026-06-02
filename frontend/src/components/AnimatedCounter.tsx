import { useEffect, useRef, useState } from 'react';

interface Props {
  value: number;
  duration?: number;
  format?: boolean;
  className?: string;
  style?: React.CSSProperties;
  prefix?: string;
}

export default function AnimatedCounter({ value, duration = 600, format = true, className, style, prefix = '' }: Props) {
  const [display, setDisplay] = useState(value);
  const frameRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const fromRef = useRef(value);

  useEffect(() => {
    fromRef.current = display;
    startRef.current = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = fromRef.current + (value - fromRef.current) * eased;
      setDisplay(current);
      if (progress < 1) frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [value, duration]);

  const formatted = format
    ? `${prefix}${display >= 0 ? '+' : ''}${display.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽`
    : `${prefix}${display.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽`;

  return <span className={className} style={style}>{formatted}</span>;
}
