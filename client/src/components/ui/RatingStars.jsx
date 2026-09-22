import { cn } from '../../utils/cn';

export default function RatingStars({ value = 0, size = 'sm', showValue = false, className }) {
  const sizes = { sm: 'h-3.5 w-3.5', md: 'h-4.5 w-4.5 h-5 w-5', lg: 'h-6 w-6' };
  const dim = sizes[size] || sizes.sm;
  const rounded = Math.round(value * 2) / 2;
  return (
    <span className={cn('inline-flex items-center gap-1', className)} aria-label={`Rated ${value} out of 5`}>
      <span className="inline-flex" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((i) => (
          <svg key={i} className={cn(dim, i <= rounded ? 'text-amber-400' : 'text-ink-200')} viewBox="0 0 20 20" fill="currentColor">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.958a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.367 2.446a1 1 0 00-.364 1.118l1.287 3.957c.3.922-.755 1.688-1.539 1.118l-3.366-2.446a1 1 0 00-1.176 0l-3.367 2.446c-.783.57-1.838-.196-1.538-1.118l1.286-3.957a1 1 0 00-.363-1.118L2.062 9.385c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.951-.69l1.286-3.958z" />
          </svg>
        ))}
      </span>
      {showValue && <span className="text-sm font-semibold text-ink-700">{Number(value).toFixed(1)}</span>}
    </span>
  );
}
