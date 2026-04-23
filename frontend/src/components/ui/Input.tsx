import { forwardRef, useState, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type MaskFn = (v: string) => string;

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  mask?: MaskFn;
  label?: string;
  error?: string;
  hint?: string;
  onChange?: (value: string) => void;
}

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { mask, label, error, hint, className, onChange, defaultValue, value, ...rest },
  ref,
) {
  const [internal, setInternal] = useState(String(value ?? defaultValue ?? ''));
  const controlled = value !== undefined;
  const current = controlled ? String(value ?? '') : internal;

  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const next = mask ? mask(raw) : raw;
    if (!controlled) setInternal(next);
    onChange?.(next);
  };

  return (
    <label className="block">
      {label && (
        <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
          {label}
        </span>
      )}
      <input
        ref={ref}
        value={current}
        onChange={handle}
        aria-invalid={!!error}
        aria-describedby={error ? `${rest.id ?? 'i'}-err` : hint ? `${rest.id ?? 'i'}-hint` : undefined}
        className={cn(
          'w-full rounded-md border bg-white px-3 py-2 text-sm transition dark:bg-slate-900',
          'border-slate-300 dark:border-slate-700',
          'focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20',
          error && 'border-red-400 focus:border-red-500 focus:ring-red-500/20',
          className,
        )}
        {...rest}
      />
      {error && (
        <span id={`${rest.id ?? 'i'}-err`} className="mt-1 block text-xs text-red-600">
          {error}
        </span>
      )}
      {!error && hint && (
        <span id={`${rest.id ?? 'i'}-hint`} className="mt-1 block text-xs text-slate-500">
          {hint}
        </span>
      )}
    </label>
  );
});
