/** Animated skeleton lines used while data loads. */
export default function Loader({ label = 'Loading…', lines = 3, className = '' }) {
  return (
    <div role="status" aria-live="polite" className={`space-y-3 ${className}`}>
      <span className="sr-only">{label}</span>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className="h-4 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800"
          style={{ width: `${Math.max(40, 100 - index * 12)}%` }}
        />
      ))}
    </div>
  );
}

/** A card-shaped skeleton for chart and metric placeholders. */
export function SkeletonCard({ height = 'h-40' }) {
  return (
    <div className={`card ${height} animate-pulse`} aria-hidden="true">
      <div className="h-4 w-1/3 rounded-full bg-slate-200 dark:bg-slate-800" />
      <div className="mt-4 h-3 w-2/3 rounded-full bg-slate-200 dark:bg-slate-800" />
    </div>
  );
}
