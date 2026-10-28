import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const TOOLTIP_STYLE = {
  background: '#0f172a',
  border: 'none',
  borderRadius: 12,
  color: '#f8fafc',
  fontSize: 12,
  padding: '8px 12px',
};

/** Grouped bar chart comparing ham and spam precision, recall and F1. */
export default function MetricsChart({ perClass }) {
  if (!perClass?.ham || !perClass?.spam) return null;

  const data = [
    { metric: 'Precision', Ham: perClass.ham.precision, Spam: perClass.spam.precision },
    { metric: 'Recall', Ham: perClass.ham.recall, Spam: perClass.spam.recall },
    { metric: 'F1', Ham: perClass.ham.f1, Spam: perClass.spam.f1 },
  ];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" vertical={false} />
        <XAxis dataKey="metric" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
        <YAxis
          domain={[0, 1]}
          tickFormatter={(value) => `${Math.round(value * 100)}%`}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip formatter={(value) => `${(Number(value) * 100).toFixed(2)}%`} contentStyle={TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        <Bar dataKey="Ham" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={44} isAnimationActive={false} />
        <Bar dataKey="Spam" fill="#ef4444" radius={[6, 6, 0, 0]} maxBarSize={44} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
