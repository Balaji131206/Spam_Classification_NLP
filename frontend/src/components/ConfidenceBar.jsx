/** Animated spam-probability bar, red when spam wins and green otherwise. */
export default function ConfidenceBar({ value = 0, label = 'Spam confidence' }) {
  const percent = Math.round((Number(value) || 0) * 100);
  const isSpam = percent >= 50;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
        <span>{label}</span>
        <span className="tabular-nums">{percent}%</span>
      </div>
      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-700 ease-out ${
            isSpam
              ? 'bg-gradient-to-r from-rose-500 to-red-600'
              : 'bg-gradient-to-r from-emerald-500 to-green-600'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
