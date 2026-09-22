import { forwardRef, useId } from 'react';
import { cn } from '../../utils/cn';

const FieldRoot = forwardRef(function FieldRoot(
  { label, error, hint, required, className, children, id },
  ref,
) {
  return (
    <div className={cn('w-full', className)} ref={ref}>
      {label && (
        <label htmlFor={id} className="label-base">
          {label}
          {required && <span className="ml-0.5 text-red-500" aria-hidden="true">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
      {error && (
        <p className="mt-1 text-xs font-medium text-red-600" role="alert">{error}</p>
      )}
    </div>
  );
});

export const Input = forwardRef(function Input({ label, error, hint, className, required, ...props }, ref) {
  const autoId = useId();
  const id = props.id || autoId;
  return (
    <FieldRoot label={label} error={error} hint={hint} required={required} id={id}>
      <input
        ref={ref}
        id={id}
        required={required}
        aria-invalid={Boolean(error) || undefined}
        className={cn('input-base', error && 'border-red-400 focus:border-red-500 focus:ring-red-100', className)}
        {...props}
      />
    </FieldRoot>
  );
});

export const Select = forwardRef(function Select({ label, error, hint, className, required, children, ...props }, ref) {
  const autoId = useId();
  const id = props.id || autoId;
  return (
    <FieldRoot label={label} error={error} hint={hint} required={required} id={id}>
      <select
        ref={ref}
        id={id}
        required={required}
        aria-invalid={Boolean(error) || undefined}
        className={cn('input-base', error && 'border-red-400', className)}
        {...props}
      >
        {children}
      </select>
    </FieldRoot>
  );
});

export const Textarea = forwardRef(function Textarea({ label, error, hint, className, required, ...props }, ref) {
  const autoId = useId();
  const id = props.id || autoId;
  return (
    <FieldRoot label={label} error={error} hint={hint} required={required} id={id}>
      <textarea
        ref={ref}
        id={id}
        required={required}
        rows={props.rows || 4}
        aria-invalid={Boolean(error) || undefined}
        className={cn('input-base resize-y', error && 'border-red-400', className)}
        {...props}
      />
    </FieldRoot>
  );
});

export default Input;
