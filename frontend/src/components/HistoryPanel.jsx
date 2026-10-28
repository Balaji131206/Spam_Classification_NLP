import { History, Trash2 } from 'lucide-react';

function formatTime(value) {
  try {
    return new Date(value).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    return '';
  }
}

/** Last ten predictions stored in localStorage; click to reload a message. */
export default function HistoryPanel({ items = [], onSelect, onClear }) {
  return (
    <section className="card" aria-labelledby="history-heading">
      <div className="flex items-center justify-between gap-3">
        <h2 id="history-heading" className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
          <History className="h-4 w-4 text-indigo-500" aria-hidden="true" />
          Recent predictions
        </h2>
        {items.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 transition-colors hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Clear
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="muted mt-4">
          Nothing here yet. Your last 10 predictions will appear in this panel.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item)}
                className="group flex w-full items-start gap-3 py-2.5 text-left"
              >
                <span
                  className={`mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                    item.label === 'SPAM'
                      ? 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                  }`}
                >
                  {item.label}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-slate-700 group-hover:text-indigo-700 dark:text-slate-300 dark:group-hover:text-indigo-300">
                    {item.message}
                  </span>
                  <span className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold uppercase dark:bg-slate-800">
                      {item.mode}
                    </span>
                    <span className="tabular-nums">{Math.round((item.spam_probability || 0) * 100)}% spam</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatTime(item.at)}</span>
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
