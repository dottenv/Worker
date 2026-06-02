import { Loader2 } from 'lucide-react';

interface Props {
  size?: number;
  className?: string;
}

export default function LoadingSpinner({ size = 24, className = '' }: Props) {
  return (
    <div className={`flex items-center justify-center py-12 ${className}`}>
      <Loader2 size={size} className="animate-spin text-indigo-500" />
    </div>
  );
}
