/**
 * Words that pushed the prediction, coloured by direction.
 * weight is the Naive Bayes log-probability difference (spam - ham).
 */
export default function WordChips({ words = [] }) {
  if (!words || words.length === 0) {
    return <p className="muted">No vocabulary words from this message influenced the model.</p>;
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {words.map(({ word, weight }) => {
        const positive = weight >= 0;
        return (
          <li key={word}>
            <span
              title={`Spam vs ham log-probability difference: ${weight}`}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                positive
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
              }`}
            >
              {word}
              <span className="tabular-nums opacity-70">
                {weight > 0 ? '+' : ''}
                {weight}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
