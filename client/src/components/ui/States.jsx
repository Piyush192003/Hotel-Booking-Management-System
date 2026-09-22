import Button from './Button';

export function EmptyState({ icon, title, description, action, className }) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-sand-400 bg-sand-50/60 px-6 py-14 text-center ${className || ''}`}>
      {icon && <div className="mb-4 text-3xl text-sand-500">{icon}</div>}
      <h3 className="text-base font-semibold text-ink-800">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = 'Something went wrong', message, onRetry, className }) {
  return (
    <div role="alert" className={`flex flex-col items-center justify-center rounded-xl border border-red-100 bg-red-50/60 px-6 py-12 text-center ${className || ''}`}>
      <svg className="mb-3 h-10 w-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M12 9v3.75m0 3.75h.008v.008H12v-.008zM10.29 3.86l-8.02 14a2 2 0 001.74 3h16.06a2 2 0 001.74-3l-8.02-14a2 2 0 00-3.5 0z" />
      </svg>
      <h3 className="text-base font-semibold text-red-800">{title}</h3>
      {message && <p className="mt-1.5 max-w-sm text-sm text-red-600">{message}</p>}
      {onRetry && (
        <div className="mt-5">
          <Button variant="secondary" size="sm" onClick={onRetry}>Try again</Button>
        </div>
      )}
    </div>
  );
}

export default EmptyState;
