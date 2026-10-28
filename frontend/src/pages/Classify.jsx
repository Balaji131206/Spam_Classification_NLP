import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { LayoutList, ShieldCheck, Sparkles, Wand2 } from 'lucide-react';
import { predict } from '../api/client';
import { useMode } from '../context/ModeContext';
import useHistory from '../hooks/useHistory';
import ClassifierCard from '../components/ClassifierCard';
import SampleMessages from '../components/SampleMessages';
import ResultCard from '../components/ResultCard';
import BatchClassifier from '../components/BatchClassifier';
import HistoryPanel from '../components/HistoryPanel';
import ErrorState from '../components/ErrorState';

const CHAR_LIMITS = { sms: 1000, email: 10000 };

export default function Classify() {
  const { mode, setMode, getStatus, refresh, loading: modesLoading } = useMode();
  const status = getStatus(mode);
  const limit = CHAR_LIMITS[mode] ?? 1000;

  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('single');
  const { items, add, clear } = useHistory();
  const pendingText = useRef(null);

  // Switching mode clears stale results; a history click restores its message.
  useEffect(() => {
    if (pendingText.current !== null) {
      setText(pendingText.current);
      pendingText.current = null;
    } else {
      setText('');
    }
    setResult(null);
    setError(null);
  }, [mode]);

  async function handleClassify() {
    const message = text.trim();
    if (!message || loading) return;
    setLoading(true);
    setError(null);

    try {
      const prediction = await predict(message, mode);
      setResult(prediction);
      add({
        message,
        mode,
        label: prediction.label,
        spam_probability: prediction.spam_probability,
      });
    } catch (err) {
      setError(err);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setText('');
    setResult(null);
    setError(null);
  }

  function handleHistorySelect(entry) {
    if (!getStatus(entry.mode).available) {
      toast.error(`${entry.mode.toUpperCase()} mode is unavailable.`);
      return;
    }
    setTab('single');
    setResult(null);
    setError(null);
    if (entry.mode === mode) {
      setText(entry.message);
    } else {
      pendingText.current = entry.message;
      setMode(entry.mode);
    }
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-sky-50 p-6 shadow-soft dark:border-indigo-500/20 dark:from-indigo-500/10 dark:via-slate-900 dark:to-sky-500/10 sm:p-9">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold text-indigo-700 ring-1 ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/30">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            NLP-powered detection
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Spam Classification Using NLP
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
            Paste an SMS or an email. A TF-IDF and Multinomial Naive Bayes pipeline labels it{' '}
            <strong className="font-semibold text-red-600 dark:text-red-400">SPAM</strong> or{' '}
            <strong className="font-semibold text-emerald-600 dark:text-emerald-400">HAM</strong> and shows
            the words behind the decision.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold">
            <span className="rounded-full bg-white px-2.5 py-1 text-slate-600 shadow-sm dark:bg-slate-800 dark:text-slate-300">
              Active: {mode === 'sms' ? 'SMS' : 'Email'} mode
            </span>
            {status.samples ? (
              <span className="rounded-full bg-white px-2.5 py-1 text-slate-600 shadow-sm dark:bg-slate-800 dark:text-slate-300">
                {status.samples.toLocaleString()} training rows
              </span>
            ) : null}
            {typeof status.accuracy === 'number' ? (
              <span className="rounded-full bg-white px-2.5 py-1 text-slate-600 shadow-sm dark:bg-slate-800 dark:text-slate-300">
                {(status.accuracy * 100).toFixed(2)}% test accuracy
              </span>
            ) : null}
          </div>
        </div>
      </section>

      {!status.available && !modesLoading && (
        <ErrorState
          title={`${mode === 'sms' ? 'SMS' : 'Email'} mode is unavailable`}
          message={status.error || 'The dataset or model for this mode could not be loaded.'}
          onRetry={refresh}
          retryLabel="Check again"
        />
      )}

      <div role="tablist" aria-label="Classification view" className="inline-flex rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
        <button
          type="button"
          role="tab"
          id="single-tab"
          aria-selected={tab === 'single'}
          aria-controls="single-panel"
          onClick={() => setTab('single')}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
            tab === 'single'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
          }`}
        >
          <Wand2 className="h-4 w-4" aria-hidden="true" />
          Single message
        </button>
        <button
          type="button"
          role="tab"
          id="batch-tab"
          aria-selected={tab === 'batch'}
          aria-controls="batch-panel"
          onClick={() => setTab('batch')}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
            tab === 'batch'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
          }`}
        >
          <LayoutList className="h-4 w-4" aria-hidden="true" />
          Batch
        </button>
      </div>

      {tab === 'single' ? (
        <div id="single-panel" role="tabpanel" aria-labelledby="single-tab" className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <ClassifierCard
              mode={mode}
              value={text}
              onChange={setText}
              onSubmit={handleClassify}
              onClear={handleClear}
              loading={loading}
              disabled={!status.available || modesLoading}
              limit={limit}
            />
            <SampleMessages mode={mode} onPick={setText} disabled={!status.available || modesLoading || loading} />
          </div>

          <div className="space-y-6">
            {error ? (
              <ErrorState
                title="Classification failed"
                message={error.message}
                onRetry={handleClassify}
                retryLabel="Retry"
              />
            ) : result ? (
              <ResultCard result={result} />
            ) : (
              <div className="card flex min-h-[16rem] flex-col items-center justify-center text-center">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-500 dark:bg-indigo-500/15 dark:text-indigo-300">
                  <ShieldCheck className="h-6 w-6" aria-hidden="true" />
                </span>
                <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">No prediction yet</p>
                <p className="muted mt-1 max-w-xs">
                  Enter a message and press Classify to see the label, confidence and influencing words.
                </p>
              </div>
            )}
            <HistoryPanel items={items} onSelect={handleHistorySelect} onClear={clear} />
          </div>
        </div>
      ) : (
        <div id="batch-panel" role="tabpanel" aria-labelledby="batch-tab" className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <BatchClassifier mode={mode} />
          </div>
          <HistoryPanel items={items} onSelect={handleHistorySelect} onClear={clear} />
        </div>
      )}
    </div>
  );
}
