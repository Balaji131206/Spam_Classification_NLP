export default function Footer() {
  return (
    <footer className="mt-12 border-t border-slate-200 bg-white/70 dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-6 text-center sm:px-6">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Balaji N | SRN: R24EI009 | IOT-A | Semester V | REVA University
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Built with FastAPI, React and scikit-learn &middot; all metrics are measured on the held-out test set.
        </p>
      </div>
    </footer>
  );
}
