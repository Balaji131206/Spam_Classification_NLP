import { Mail, MessageSquare } from 'lucide-react';
import { useMode } from '../context/ModeContext';

const OPTIONS = [
  { value: 'sms', label: 'SMS', Icon: MessageSquare },
  { value: 'email', label: 'Email', Icon: Mail },
];

/**
 * Segmented SMS | Email switch. A mode whose dataset or model failed to load
 * is disabled and explains why through its tooltip and screen-reader text.
 */
export default function ModeSwitch() {
  const { mode, setMode, getStatus } = useMode();

  return (
    <div
      role="group"
      aria-label="Classification mode"
      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100/80 p-1 dark:border-slate-700 dark:bg-slate-800/80"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const status = getStatus(value);
        const active = mode === value;
        const disabled = !status.available;

        return (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            disabled={disabled}
            aria-pressed={active}
            title={
              disabled
                ? `${label} mode is unavailable: ${status.error || 'dataset or model missing'}`
                : `Switch to ${label} mode`
            }
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 sm:text-sm ${
              active
                ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-950 dark:text-indigo-300'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
            } ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
            {disabled && <span className="sr-only"> (unavailable)</span>}
          </button>
        );
      })}
    </div>
  );
}
