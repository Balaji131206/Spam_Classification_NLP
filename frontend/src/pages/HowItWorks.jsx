import { Braces, Link2, Mail, Sigma } from 'lucide-react';
import PipelineSteps from '../components/PipelineSteps';

function InfoCard({ icon: Icon, title, children }) {
  return (
    <section className="card">
      <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
        <Icon className="h-4 w-4 text-indigo-500" aria-hidden="true" />
        {title}
      </h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{children}</div>
    </section>
  );
}

export default function HowItWorks() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="section-title">How it Works</h1>
        <p className="muted mt-1 max-w-3xl">
          Every message travels through the same seven-stage pipeline. The only difference between SMS and
          email mode is an extra cleaning step for HTML, links and addresses.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PipelineSteps />
        </div>

        <aside className="space-y-6">
          <InfoCard icon={Mail} title="Email-only cleaning">
            <p>Email bodies carry markup and tracking links, so email mode cleans them before the shared steps:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>HTML tags such as <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">&lt;p&gt;</code> are removed.</li>
              <li>URLs are replaced with the single token <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">urltoken</code>.</li>
              <li>Email addresses are replaced with <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">emailtoken</code>.</li>
            </ul>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              This keeps the model focused on wording instead of one-off domains and tracking parameters.
            </p>
          </InfoCard>

          <InfoCard icon={Sigma} title="TF-IDF at a glance">
            <p>
              Term Frequency &times; Inverse Document Frequency. A word scores high when it appears often in
              this message but rarely across the corpus, and low when it is everywhere (like &ldquo;the&rdquo;).
            </p>
            <code className="block overflow-x-auto rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-indigo-700 dark:bg-slate-950 dark:text-indigo-300">
              tfidf(t, d) = tf(t, d) × log(N / df(t))
            </code>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              The vectorizer is fitted on the training split only and reused for the test set and live input.
            </p>
          </InfoCard>

          <InfoCard icon={Braces} title="Multinomial Naive Bayes">
            <p>
              NB treats each token as independent evidence. For every class it multiplies the class prior by
              each word&rsquo;s likelihood, then picks the class with the larger score.
            </p>
            <code className="block overflow-x-auto rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-indigo-700 dark:bg-slate-950 dark:text-indigo-300">
              P(spam | tokens) ∝ P(spam) × ∏ P(token | spam)
            </code>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              The log-probability gap between spam and ham is what the influencing-word chips visualise.
            </p>
          </InfoCard>

          <InfoCard icon={Link2} title="From text to label">
            <p>
              Live predictions reuse the exact same preprocessing, vectorizer and model as evaluation, so a
              99% confidence in the UI means the same thing as a 99% in the metrics.
            </p>
          </InfoCard>
        </aside>
      </div>
    </div>
  );
}
