import { AlertTriangle, RefreshCw } from 'lucide-react';

/** Friendly, actionable error card used for backend and mode failures. */
export default function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try again',
}) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-red-200 bg-red-50/80 p-5 shadow-soft dark:border-red-500/30 dark:bg-red-500/10 sm:p-6"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-red-800 dark:text-red-200">{title}</h2>
          {message && (
            <p className="mt-1.5 break-words text-sm text-red-700 dark:text-red-200/85">{message}</p>
          )}
          {onRetry && (
            <button type="button" onClick={onRetry} className="btn-secondary mt-4">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              {retryLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
