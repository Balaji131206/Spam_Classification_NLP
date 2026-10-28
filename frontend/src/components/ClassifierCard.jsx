import { Eraser, Loader2, Sparkles } from 'lucide-react';

/** Large textarea with character counter and classify/clear actions. */
export default function ClassifierCard({
  mode,
  value,
  onChange,
  onSubmit,
  onClear,
  loading = false,
  disabled = false,
  limit = 1000,
}) {
  const used = value.length;
  const ratio = used / limit;
  const counterTone =
    ratio >= 1
      ? 'text-red-600 dark:text-red-400'
      : ratio >= 0.9
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-slate-500 dark:text-slate-400';
  const isEmail = mode === 'email';

  return (
    <form
      className="card"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor="message-input" className="text-sm font-semibold text-slate-900 dark:text-white">
          {isEmail ? 'Email content' : 'SMS message'}
        </label>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          {mode} mode
        </span>
      </div>

      <textarea
        id="message-input"
        name="message"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={isEmail ? 11 : 5}
        maxLength={limit}
        disabled={disabled || loading}
        placeholder={
          isEmail
            ? 'Paste the full email here, including the subject line…'
            : 'Type or paste an SMS message, e.g. "You have won a free prize, claim now!"'
        }
        aria-describedby="message-help message-counter"
        className="input mt-3 resize-y"
      />

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p id="message-help" className="text-xs text-slate-500 dark:text-slate-400">
          {isEmail
            ? 'HTML tags are stripped; URLs and email addresses are masked before TF-IDF.'
            : 'Up to 1,000 characters. Short messages work best.'}
        </p>
        <p id="message-counter" aria-live="polite" className={`text-xs font-medium tabular-nums ${counterTone}`}>
          {used.toLocaleString()} / {limit.toLocaleString()}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="submit"
          className="btn-primary flex-1 sm:flex-none"
          disabled={loading || disabled || !value.trim()}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          )}
          {loading ? 'Classifying…' : 'Classify'}
        </button>
        <button
          type="button"
          onClick={onClear}
          className="btn-secondary"
          disabled={loading || value.length === 0}
        >
          <Eraser className="h-4 w-4" aria-hidden="true" />
          Clear
        </button>
      </div>
    </form>
  );
}
