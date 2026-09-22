import { cn } from '../../utils/cn';

export function Spinner({ className, label = 'Loading' }) {
  return (
    <div role="status" aria-label={label} className={cn('flex items-center justify-center py-10', className)}>
      <svg className="h-8 w-8 animate-spin text-brand-600" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
    </div>
  );
}

export function LoadingSkeleton({ className, lines = 3 }) {
  return (
    <div className={cn('animate-pulse space-y-3', className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 rounded bg-ink-100" style={{ width: `${100 - (i % 3) * 12}%` }} />
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="card-base overflow-hidden" aria-hidden="true">
      <div className="h-48 w-full animate-pulse bg-ink-100" />
      <div className="space-y-3 p-5">
        <div className="h-5 w-2/3 animate-pulse rounded bg-ink-100" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-ink-100" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-ink-100" />
      </div>
    </div>
  );
}
