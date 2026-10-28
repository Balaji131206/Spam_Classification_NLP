const STEPS = [
  {
    title: 'Raw text',
    description: 'The message arrives exactly as typed, including punctuation, links and casing.',
    example: 'Congratulations! You won a FREE prize. Claim at http://bit.ly/win now!',
  },
  {
    title: 'Cleaning',
    description:
      'Email mode strips HTML tags, replaces URLs with "urltoken" and addresses with "emailtoken". SMS mode skips this step.',
    example: 'Congratulations! You won a FREE prize. Claim at urltoken now!',
  },
  {
    title: 'Lowercasing',
    description: 'Every character is lowercased so "FREE", "Free" and "free" become the same feature.',
    example: 'congratulations! you won a free prize. claim at urltoken now!',
  },
  {
    title: 'Tokenization & normalisation',
    description:
      'Non-alphanumeric characters are removed and whitespace is collapsed, leaving plain word tokens.',
    example: 'congratulations you won a free prize claim at urltoken now',
  },
  {
    title: 'TF-IDF vectorisation',
    description:
      'Each token becomes a weight: frequent-in-this-message but rare-in-the-corpus words score high. English stop words are removed.',
    example: 'won=0.41  free=0.38  prize=0.33  the=0.00',
  },
  {
    title: 'Multinomial Naive Bayes',
    description:
      'The model multiplies the per-word spam and ham likelihoods with the class priors to score both classes.',
    example: 'P(spam|tokens) = 0.993   P(ham|tokens) = 0.007',
  },
  {
    title: 'Prediction',
    description:
      'The higher score wins. The API also returns the probability and the words with the largest spam-vs-ham contribution.',
    example: 'SPAM · 99.3% · top words: won, prize, free',
  },
];

/** Vertical timeline of the seven pipeline stages with a tiny example each. */
export default function PipelineSteps({ steps = STEPS }) {
  return (
    <ol className="space-y-3">
      {steps.map((step, index) => (
        <li key={step.title} className="relative flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-indigo-600 text-xs font-bold text-white">
            {index + 1}
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{step.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{step.description}</p>
            <code className="mt-2 block overflow-x-auto rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-indigo-700 dark:bg-slate-950 dark:text-indigo-300">
              {step.example}
            </code>
          </div>
        </li>
      ))}
    </ol>
  );
}
