import { cn } from '../../utils/cn';
import { titleCase } from '../../utils/format';

const STYLES = {
  // booking statuses
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  confirmed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  cancelled: 'bg-red-50 text-red-700 ring-red-200',
  completed: 'bg-sky-50 text-sky-700 ring-sky-200',
  no_show: 'bg-ink-100 text-ink-600 ring-ink-200',
  // payment statuses
  paid: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  failed: 'bg-red-50 text-red-700 ring-red-200',
  refunded: 'bg-violet-50 text-violet-700 ring-violet-200',
  partially_refunded: 'bg-violet-50 text-violet-700 ring-violet-200',
  // hotel statuses
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  rejected: 'bg-red-50 text-red-700 ring-red-200',
  suspended: 'bg-orange-50 text-orange-700 ring-orange-200',
  draft: 'bg-ink-100 text-ink-600 ring-ink-200',
  // review / misc
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  hidden: 'bg-ink-100 text-ink-600 ring-ink-200',
  removed: 'bg-red-50 text-red-700 ring-red-200',
  blocked: 'bg-red-50 text-red-700 ring-red-200',
  unblocked: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  error: 'bg-red-50 text-red-700 ring-red-200',
  info: 'bg-brand-50 text-brand-700 ring-brand-200',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  neutral: 'bg-ink-100 text-ink-700 ring-ink-200',
};

export default function Badge({ status, className, children }) {
  const style = STYLES[status] || STYLES.neutral;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
        style,
        className,
      )}
    >
      {children || titleCase(status)}
    </span>
  );
}
