/** Scrollable table of batch predictions. */
export default function ResultsTable({ results = [] }) {
  if (!results.length) {
    return <p className="muted">No results yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
        <caption className="sr-only">Batch classification results</caption>
        <thead>
          <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
            <th scope="col" className="px-2 py-2 font-semibold">#</th>
            <th scope="col" className="px-2 py-2 font-semibold">Message</th>
            <th scope="col" className="px-2 py-2 font-semibold">Label</th>
            <th scope="col" className="px-2 py-2 text-right font-semibold">Spam %</th>
          </tr>
        </thead>
        <tbody>
          {results.map((result) => (
            <tr key={result.index} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
              <td className="px-2 py-2.5 text-xs tabular-nums text-slate-500 dark:text-slate-400">{result.index}</td>
              <td className="max-w-xs px-2 py-2.5">
                <span className="block truncate text-slate-700 dark:text-slate-300" title={result.message}>
                  {result.message}
                </span>
              </td>
              <td className="px-2 py-2.5">
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${
                    result.label === 'SPAM'
                      ? 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                  }`}
                >
                  {result.label}
                </span>
              </td>
              <td className="px-2 py-2.5 text-right text-xs tabular-nums text-slate-600 dark:text-slate-300">
                {Math.round(result.spam_probability * 100)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
