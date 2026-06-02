interface SkeletonBlockProps {
  className?: string;
}

function SkeletonBlock({ className = '' }: SkeletonBlockProps) {
  return (
    <div
      className={`animate-pulse bg-gray-200 rounded-xl ${className}`}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white p-4 rounded-2xl border border-gray-100 space-y-3">
      <SkeletonBlock className="h-5 w-2/3" />
      <SkeletonBlock className="h-3 w-full" />
      <SkeletonBlock className="h-3 w-1/2" />
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-white p-4 rounded-2xl border border-gray-100 space-y-2">
        <SkeletonBlock className="h-8 w-16" />
        <SkeletonBlock className="h-3 w-20" />
      </div>
      <div className="bg-white p-4 rounded-2xl border border-gray-100 space-y-2">
        <SkeletonBlock className="h-8 w-16" />
        <SkeletonBlock className="h-3 w-20" />
      </div>
    </div>
  );
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
