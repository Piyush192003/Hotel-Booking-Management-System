export default function EmptyState({ icon = null, title, description, action = null, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-200 bg-white px-6 py-14 text-center ${className}`}>
      {icon && <div className="mb-3 text-ink-300">{icon}</div>}
      <h3 className="font-display text-base font-bold text-ink-900">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
