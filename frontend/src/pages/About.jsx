import { AlertTriangle, CheckCircle2, Compass, Flag, Target } from 'lucide-react';

function SectionCard({ icon: Icon, title, children, tone = 'indigo' }) {
  const tones = {
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
    sky: 'bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300',
  };

  return (
    <section className="card">
      <div className="flex items-center gap-2.5">
        <span className={`grid h-9 w-9 place-items-center rounded-xl ${tones[tone]}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
      </div>
      <div className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{children}</div>
    </section>
  );
}

export default function About() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="section-title">About this project</h1>
        <p className="muted mt-1 max-w-3xl">
          A Natural Language Processing assignment that classifies SMS messages and emails as spam or ham
          using classical machine learning, exposed through a FastAPI backend and a React dashboard.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard icon={Flag} title="What it is">
          <p>
            Two independent classifiers sit behind one interface. SMS mode learns from the SMS Spam
            Collection and email mode learns from the supplied email dataset. Each mode has its own TF-IDF
            vectorizer, Multinomial Naive Bayes model and evaluation report, so the scores never mix.
          </p>
          <p className="mt-2">
            The interface exposes single and batch classification, the measured evaluation metrics, the
            dataset composition and the exact preprocessing pipeline.
          </p>
        </SectionCard>

        <SectionCard icon={Target} title="Objectives" tone="sky">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Build an end-to-end NLP pipeline from raw text to a spam/ham decision.</li>
            <li>Compare the same algorithm on two different text domains (SMS and email).</li>
            <li>Evaluate with a stratified 80/20 split and report precision, recall, F1 and a confusion matrix.</li>
            <li>Keep the UI honest: every figure shown is read from a real training run.</li>
          </ul>
        </SectionCard>

        <SectionCard icon={CheckCircle2} title="Advantages" tone="emerald">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Fast to train and cheap to run; no GPU or external API required.</li>
            <li>Interpretable: the top words behind each prediction are shown.</li>
            <li>Duplicate texts are removed before splitting, so accuracy is not inflated by leakage.</li>
            <li>Each mode degrades independently; a missing dataset disables only that mode.</li>
          </ul>
        </SectionCard>

        <SectionCard icon={AlertTriangle} title="Limitations" tone="amber">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              Models trained on one public dataset may not generalise to every real-world spam campaign,
              language or format.
            </li>
            <li>
              Naive Bayes assumes token independence and can miss context, sarcasm and obfuscated spam
              (&ldquo;fr33&rdquo;, &ldquo;v1agra&rdquo;).
            </li>
            <li>
              The email model inherits the label balance and bias of its dataset; spam recall in particular is
              visible on the Performance page.
            </li>
            <li>Character limits (1,000 for SMS, 10,000 for email) keep inference predictable.</li>
          </ul>
        </SectionCard>
      </div>

      <SectionCard icon={Compass} title="Future scope" tone="indigo">
        <div className="grid gap-3 sm:grid-cols-2">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Compare against linear SVM, logistic regression and gradient boosting.</li>
            <li>Add word and character n-grams to catch obfuscated tokens.</li>
            <li>Handle class imbalance with class priors or resampling.</li>
          </ul>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Explain predictions with SHAP or LIME instead of raw log-probability gaps.</li>
            <li>Support multilingual spam detection and a feedback loop for corrections.</li>
            <li>Deploy with a database-backed review queue and monitoring for drift.</li>
          </ul>
        </div>
      </SectionCard>
    </div>
  );
}
