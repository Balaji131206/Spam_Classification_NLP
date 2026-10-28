const CELLS = [
  { key: 'tn', label: 'TN', meaning: 'Ham correctly classified as ham', good: true },
  { key: 'fp', label: 'FP', meaning: 'Ham wrongly flagged as spam', good: false },
  { key: 'fn', label: 'FN', meaning: 'Spam missed by the model', good: false },
  { key: 'tp', label: 'TP', meaning: 'Spam correctly caught', good: true },
];

/** 2x2 confusion-matrix heatmap with a plain-English legend. */
export default function ConfusionMatrix({ matrix }) {
  if (!matrix) return null;

  const cell = (key) => {
    const config = CELLS.find((item) => item.key === key);
    const value = matrix[key] ?? 0;
    return (
      <div
        key={key}
        className={`rounded-xl p-3 text-center ring-1 ${
          config.good
            ? 'bg-emerald-50 ring-emerald-200/70 dark:bg-emerald-500/10 dark:ring-emerald-500/25'
            : 'bg-rose-50 ring-rose-200/70 dark:bg-rose-500/10 dark:ring-rose-500/25'
        }`}
      >
        <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{value}</p>
        <p
          className={`mt-0.5 text-[11px] font-bold uppercase ${
            config.good ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
          }`}
        >
          {config.label}
        </p>
      </div>
    );
  };

  return (
    <div>
      <div className="grid grid-cols-[4.5rem_1fr_1fr] items-center gap-2">
        <div aria-hidden="true" />
        <p className="text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Predicted ham
        </p>
        <p className="text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Predicted spam
        </p>

        <p className="text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Actual ham
        </p>
        {cell('tn')}
        {cell('fp')}

        <p className="text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Actual spam
        </p>
        {cell('fn')}
        {cell('tp')}
      </div>

      <dl className="mt-4 grid gap-2 text-xs text-slate-600 dark:text-slate-300 sm:grid-cols-2">
        {CELLS.map((config) => (
          <div key={config.key} className="flex items-start gap-2">
            <dt className="mt-0.5 w-7 shrink-0 font-bold text-slate-700 dark:text-slate-200">{config.label}</dt>
            <dd>{config.meaning}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
