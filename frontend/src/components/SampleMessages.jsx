const SAMPLES = {
  sms: [
    {
      label: 'Prize spam',
      text: 'Congratulations! You have won a FREE cash prize of $1000. Claim now by calling 09061701461.',
    },
    {
      label: 'Promo spam',
      text: 'URGENT! Your mobile number has been awarded a £2000 bonus. Text WIN to 80086 to claim before midnight.',
    },
    {
      label: 'Class notes',
      text: "Can you send me today's assignment notes?",
    },
    {
      label: 'Catching up',
      text: 'Hey, are we still meeting at the library after class?',
    },
  ],
  email: [
    {
      label: 'Pharmacy spam',
      text: 'Subject: Special offer - cheap medication online\n\nWe are pleased to introduce ourselves as one of the leading online pharmaceutical companies. Buy viagra and cialis at amazing prices, no prescription needed. Click here for details and get 12 free pills with your order. Money back guaranteed!',
    },
    {
      label: 'Marketing spam',
      text: 'Subject: Your new company logo and website\n\nWe are pleased to introduce ourselves as a leading design company. Thinking of breathing new life into your business? We provide original logos, stationery and a content management system at affordable prices. 100% satisfaction guaranteed, with unlimited changes at no extra fees.',
    },
    {
      label: 'Project meeting',
      text: 'Subject: Project meeting\n\nHi Balaji, can we meet tomorrow at 10 AM to review the NLP assignment? Please bring the dataset notes. Thanks, Priya',
    },
    {
      label: 'Assignment notice',
      text: 'Subject: Assignment submission\n\nDear student, the deadline for the NLP report is Friday. Please submit your PDF on the portal before 5 PM. Regards, Course Coordinator',
    },
  ],
};

/** Four one-click examples (two spam, two ham) that follow the active mode. */
export default function SampleMessages({ mode, onPick, disabled = false }) {
  const samples = SAMPLES[mode] || SAMPLES.sms;

  return (
    <section aria-labelledby="samples-heading">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="samples-heading" className="text-sm font-semibold text-slate-900 dark:text-white">
          Try a sample
        </h2>
        <span className="text-xs text-slate-500 dark:text-slate-400">2 spam · 2 ham</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {samples.map((sample) => (
          <button
            key={sample.label}
            type="button"
            disabled={disabled}
            onClick={() => onPick(sample.text)}
            className="rounded-xl border border-slate-200 bg-white p-3 text-left text-xs leading-relaxed text-slate-600 transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-soft disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-500/50"
          >
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
              {sample.label}
            </span>
            <span className="line-clamp-3">{sample.text}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
