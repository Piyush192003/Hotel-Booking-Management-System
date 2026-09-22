import { cn } from '../../utils/cn';

export default function Pagination({ page, pages, total, onChange, className }) {
  if (!pages || pages <= 1) return null;
  const window = 2;
  const nums = [];
  for (let i = Math.max(1, page - window); i <= Math.min(pages, page + window); i += 1) nums.push(i);

  return (
    <nav aria-label="Pagination" className={cn('flex items-center justify-center gap-1.5', className)}>
      <button
        type="button"
        className="rounded-lg border border-ink-200 px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-ink-50 disabled:opacity-50"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Prev
      </button>
      {nums[0] > 1 && <span className="px-1 text-ink-400">…</span>}
      {nums.map((n) => (
        <button
          key={n}
          type="button"
          aria-current={n === page ? 'page' : undefined}
          className={cn(
            'min-w-[2.25rem] rounded-lg px-3 py-1.5 text-sm font-medium shadow-sm',
            n === page ? 'bg-brand-gradient text-white shadow-brand-glow' : 'border border-ink-200 bg-white text-ink-700 hover:bg-sand-50 hover:border-brand-300',
          )}
          onClick={() => onChange(n)}
        >
          {n}
        </button>
      ))}
      {nums[nums.length - 1] < pages && <span className="px-1 text-ink-400">…</span>}
      <button
        type="button"
        className="rounded-lg border border-ink-200 px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-ink-50 disabled:opacity-50"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        Next
      </button>
      {typeof total === 'number' && (
        <span className="ml-3 hidden text-sm text-ink-500 sm:inline">{total} result{total === 1 ? '' : 's'}</span>
      )}
    </nav>
  );
}
