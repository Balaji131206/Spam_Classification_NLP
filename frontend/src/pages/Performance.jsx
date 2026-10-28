import { useEffect, useState } from 'react';
import { Activity, Crosshair, Gauge, Percent } from 'lucide-react';
import { getMetrics } from '../api/client';
import { useMode } from '../context/ModeContext';
import useMetrics from '../hooks/useMetrics';
import StatCard from '../components/StatCard';
import ConfusionMatrix from '../components/ConfusionMatrix';
import MetricsChart from '../components/MetricsChart';
import DatasetChart from '../components/DatasetChart';
import TopWordsChart from '../components/TopWordsChart';
import ErrorState from '../components/ErrorState';
import Loader, { SkeletonCard } from '../components/Loader';

const METRIC_KEYS = ['accuracy', 'precision', 'recall', 'f1'];

function percent(value) {
  return typeof value === 'number' ? `${(value * 100).toFixed(2)}%` : '—';
}

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch (error) {
    return value;
  }
}

export default function Performance() {
  const { mode, getStatus, loading: modesLoading } = useMode();
  const status = getStatus(mode);
  const { metrics, dataset, loading, error, reload } = useMetrics(mode);
  const [comparison, setComparison] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.allSettled([getMetrics('sms'), getMetrics('email')]).then(([sms, email]) => {
      if (!active) return;
      setComparison({
        sms: sms.status === 'fulfilled' ? sms.value : null,
        email: email.status === 'fulfilled' ? email.value : null,
      });
    });
    return () => {
      active = false;
    };
  }, [mode]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="section-title">Performance</h1>
          <p className="muted mt-1">
            Held-out evaluation for{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {mode === 'sms' ? 'SMS' : 'email'} mode
            </span>
            {metrics?.dataset?.dataset_name ? ` · ${metrics.dataset.dataset_name}` : ''}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
          {dataset && (
            <>
              <span className="rounded-full bg-white px-2.5 py-1 text-slate-600 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800">
                {dataset.rows_after_cleaning.toLocaleString()} rows
              </span>
              <span className="rounded-full bg-white px-2.5 py-1 text-slate-600 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800">
                {dataset.train_size?.toLocaleString()} train · {dataset.test_size?.toLocaleString()} test
              </span>
            </>
          )}
          {metrics?.trained_at && (
            <span className="rounded-full bg-white px-2.5 py-1 text-slate-600 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800">
              trained {formatDate(metrics.trained_at)}
            </span>
          )}
        </div>
      </header>

      {!status.available && !modesLoading ? (
        <ErrorState
          title={`${mode === 'sms' ? 'SMS' : 'Email'} metrics are unavailable`}
          message={status.error || 'This mode has no trained model.'}
        />
      ) : error ? (
        <ErrorState title="Could not load metrics" message={error.message} onRetry={reload} />
      ) : loading ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonCard key={index} height="h-28" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <SkeletonCard height="h-80" />
            <SkeletonCard height="h-80" />
          </div>
          <Loader label="Loading evaluation metrics" lines={2} />
        </div>
      ) : metrics ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Accuracy"
              value={percent(metrics.metrics.accuracy)}
              hint="Correct labels on the test set"
              tone="indigo"
              Icon={Gauge}
            />
            <StatCard
              label="Precision"
              value={percent(metrics.metrics.precision)}
              hint="Weighted across ham + spam"
              tone="sky"
              Icon={Crosshair}
            />
            <StatCard
              label="Recall"
              value={percent(metrics.metrics.recall)}
              hint="Weighted across ham + spam"
              tone="emerald"
              Icon={Activity}
            />
            <StatCard
              label="F1 score"
              value={percent(metrics.metrics.f1)}
              hint="Harmonic mean, weighted"
              tone="rose"
              Icon={Percent}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="card" aria-labelledby="confusion-heading">
              <h2 id="confusion-heading" className="text-base font-semibold text-slate-900 dark:text-white">
                Confusion matrix
              </h2>
              <p className="muted mt-1">
                {metrics.dataset.test_size.toLocaleString()} held-out messages. Spam class: precision{' '}
                {percent(metrics.spam_metrics.precision)}, recall {percent(metrics.spam_metrics.recall)}, F1{' '}
                {percent(metrics.spam_metrics.f1)}.
              </p>
              <div className="mt-4">
                <ConfusionMatrix matrix={metrics.confusion_matrix} />
              </div>
            </section>

            <section className="card" aria-labelledby="per-class-heading">
              <h2 id="per-class-heading" className="text-base font-semibold text-slate-900 dark:text-white">
                Per-class scores
              </h2>
              <p className="muted mt-1">Precision, recall and F1 for ham and spam separately.</p>
              <div className="mt-4 h-72">
                <MetricsChart perClass={metrics.per_class} />
              </div>
            </section>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="card" aria-labelledby="distribution-heading">
              <h2 id="distribution-heading" className="text-base font-semibold text-slate-900 dark:text-white">
                Dataset distribution
              </h2>
              <p className="muted mt-1">
                After removing {metrics.dataset.duplicates_removed.toLocaleString()} duplicate texts and{' '}
                {metrics.dataset.nulls_removed.toLocaleString()} empty rows.
              </p>
              <div className="mt-4 h-72">
                <DatasetChart dataset={metrics.dataset} />
              </div>
            </section>

            <section className="card" aria-labelledby="words-heading">
              <h2 id="words-heading" className="text-base font-semibold text-slate-900 dark:text-white">
                Top spam-indicative words
              </h2>
              <p className="muted mt-1">Largest spam-vs-ham log-probability gap in the model vocabulary.</p>
              <div className="mt-4 h-72">
                <TopWordsChart words={metrics.top_spam_words} />
              </div>
            </section>
          </div>

          <section className="card" aria-labelledby="comparison-heading">
            <h2 id="comparison-heading" className="text-base font-semibold text-slate-900 dark:text-white">
              SMS vs Email
            </h2>
            <p className="muted mt-1">The two modes are trained separately on their own datasets.</p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    <th scope="col" className="py-2 pr-3 font-semibold">Metric</th>
                    <th scope="col" className="px-3 py-2 font-semibold">SMS</th>
                    <th scope="col" className="px-3 py-2 font-semibold">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {METRIC_KEYS.map((key) => (
                    <tr key={key} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                      <th scope="row" className="py-2.5 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {key === 'f1' ? 'F1' : key}
                      </th>
                      <td className="px-3 py-2.5 tabular-nums text-slate-700 dark:text-slate-200">
                        {comparison?.sms ? percent(comparison.sms.metrics[key]) : '—'}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-slate-700 dark:text-slate-200">
                        {comparison?.email ? percent(comparison.email.metrics[key]) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Metrics are computed on the 20% held-out test set. Every value on this page is read from the model
            run stored in <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">models/</code>.
          </p>
        </>
      ) : null}
    </div>
  );
}
