import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import ConfidenceBar from './ConfidenceBar';
import WordChips from './WordChips';

/** Shows label, probabilities, cleaned text and top influencing words. */
export default function ResultCard({ result }) {
  const isSpam = result.label === 'SPAM';

  return (
    <section className="card animate-fade-in" aria-live="polite" aria-label="Prediction result">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">Result</h2>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          {result.mode} mode
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span
          className={`inline-flex animate-pop-in items-center gap-2 rounded-full px-4 py-2 text-sm font-bold uppercase tracking-wide ${
            isSpam
              ? 'bg-red-100 text-red-700 ring-1 ring-red-200 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-500/30'
              : 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30'
          }`}
        >
          {isSpam ? (
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          )}
          {result.label}
        </span>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {isSpam ? 'This message looks like spam.' : 'This message looks legitimate.'}
        </p>
      </div>

      <div className="mt-5">
        <ConfidenceBar value={result.spam_probability} label="Spam probability" />
        <div className="mt-1.5 flex justify-between text-xs tabular-nums text-slate-500 dark:text-slate-400">
          <span>Spam {Math.round(result.spam_probability * 100)}%</span>
          <span>Ham {Math.round(result.ham_probability * 100)}%</span>
        </div>
      </div>

      <div className="mt-5">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Cleaned text
        </h3>
        <p className="mt-2 max-h-40 overflow-y-auto break-words rounded-xl bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-600 dark:bg-slate-950 dark:text-slate-300">
          {result.cleaned_text || '—'}
        </p>
      </div>

      <div className="mt-5">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Top influencing words
        </h3>
        <div className="mt-2">
          <WordChips words={result.top_contributing_words} />
        </div>
      </div>
    </section>
  );
}
