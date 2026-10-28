import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

const TOOLTIP_STYLE = {
  background: '#0f172a',
  border: 'none',
  borderRadius: 12,
  color: '#f8fafc',
  fontSize: 12,
  padding: '8px 12px',
};

/** Doughnut of the cleaned spam/ham distribution for the active dataset. */
export default function DatasetChart({ dataset }) {
  if (!dataset) return null;

  const data = [
    { name: 'Spam', value: dataset.spam_count ?? 0, color: '#ef4444' },
    { name: 'Ham', value: dataset.ham_count ?? 0, color: '#10b981' },
  ];
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="relative h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="55%"
            outerRadius="80%"
            paddingAngle={2}
            stroke="none"
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [
              `${Number(value).toLocaleString()} (${((Number(value) / total) * 100).toFixed(1)}%)`,
              name,
            ]}
            contentStyle={TOOLTIP_STYLE}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 top-[38%] -translate-y-1/2 text-center">
        <p className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">{total.toLocaleString()}</p>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          cleaned rows
        </p>
      </div>
    </div>
  );
}
