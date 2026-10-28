import { useState } from 'react';
import toast from 'react-hot-toast';
import { Download, Loader2, Play } from 'lucide-react';
import { predictBatch } from '../api/client';
import ResultsTable from './ResultsTable';

const MAX_MESSAGES = 100;

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

/** Classifies many messages at once and offers the results as CSV. */
export default function BatchClassifier({ mode }) {
  const [text, setText] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const isEmail = mode === 'email';

  function parseMessages() {
    if (isEmail) {
      return text
        .split(/^\s*---\s*$/m)
        .map((part) => part.trim())
        .filter(Boolean);
    }
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    const messages = parseMessages();

    if (messages.length === 0) {
      setError(isEmail ? 'Add at least one email (separate emails with a line containing ---).' : 'Add at least one SMS (one per line).');
      return;
    }
    if (messages.length > MAX_MESSAGES) {
      setError(`You added ${messages.length} messages. The limit is ${MAX_MESSAGES}.`);
      return;
    }

    setLoading(true);
    try {
      const data = await predictBatch(messages, mode);
      setResponse(data);
      toast.success(`Classified ${data.summary.total} messages.`);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  function downloadCsv() {
    if (!response?.results?.length) return;
    const header = ['index', 'message', 'label', 'spam_probability', 'ham_probability'];
    const rows = response.results.map((result) =>
      [result.index, result.message, result.label, result.spam_probability, result.ham_probability]
        .map(csvCell)
        .join(','),
    );
    const blob = new Blob([[header.join(','), ...rows].join('\r\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `spam-predictions-${mode}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded.');
  }

  return (
    <section className="card" aria-labelledby="batch-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="batch-heading" className="text-base font-semibold text-slate-900 dark:text-white">
          Batch classification
        </h2>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          max {MAX_MESSAGES}
        </span>
      </div>
      <p className="muted mt-1">
        {isEmail
          ? 'Paste multiple emails separated by a line containing only "---".'
          : 'Paste one SMS message per line.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-3">
        <label htmlFor="batch-input" className="sr-only">
          Messages to classify
        </label>
        <textarea
          id="batch-input"
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={isEmail ? 10 : 7}
          disabled={loading}
          placeholder={
            isEmail
              ? 'Subject: First email\n\nBody text…\n---\nSubject: Second email\n\nBody text…'
              : 'Congratulations, you won a free prize!\nCan you send the notes after class?'
          }
          className="input resize-y font-mono text-xs"
        />

        {error && (
          <p role="alert" className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="submit" className="btn-primary" disabled={loading || !text.trim()}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Play className="h-4 w-4" aria-hidden="true" />
            )}
            {loading ? 'Classifying…' : 'Classify batch'}
          </button>
          {response?.results?.length > 0 && (
            <button type="button" className="btn-secondary" onClick={downloadCsv}>
              <Download className="h-4 w-4" aria-hidden="true" />
              Download CSV
            </button>
          )}
        </div>
      </form>

      {response && (
        <div className="mt-6 animate-fade-in">
          <div className="mb-3 flex flex-wrap items-center gap-3 text-xs">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {response.summary.total} messages
            </span>
            <span className="rounded-full bg-red-100 px-2.5 py-1 font-semibold text-red-700 dark:bg-red-500/15 dark:text-red-300">
              {response.summary.spam} spam
            </span>
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
              {response.summary.ham} ham
            </span>
          </div>
          <ResultsTable results={response.results} />
        </div>
      )}
    </section>
  );
}
