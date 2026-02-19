'use client';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface PaymentSuccessChartProps {
  successRate: number;
  stats: {
    completed: number;
    total: number;
    refunded: number;
    disputed: number;
  };
}

interface PaymentTooltipProps {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number;
    payload?: {
      color?: string;
    };
  }>;
  total: number;
}

const COLORS = {
  completed: '#0f766e',
  refunded: '#f59e0b',
  disputed: '#ef4444',
};

function PaymentTooltip({ active, payload, total }: PaymentTooltipProps) {
  const first = payload?.[0];
  const value = typeof first?.value === 'number' ? first.value : null;
  const name = first?.name;

  if (!active || value === null || !name) {
    return null;
  }

  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
  const color = first?.payload?.color || '#334155';

  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 p-3 shadow-[0_16px_32px_-24px_rgba(15,23,42,.6)]">
      <p className="text-sm font-medium text-slate-900">{name}</p>
      <p className="text-sm" style={{ color }}>
        {value} ({percentage}%)
      </p>
    </div>
  );
}

export function PaymentSuccessChart({ successRate, stats }: PaymentSuccessChartProps) {
  const pieData = [
    { name: 'Completed', value: stats.completed, color: COLORS.completed },
    { name: 'Refunded', value: stats.refunded, color: COLORS.refunded },
    { name: 'Disputed', value: stats.disputed, color: COLORS.disputed },
  ].filter((item) => item.value > 0);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="text-3xl font-bold text-slate-900">{successRate}%</div>
        <div className="text-sm text-slate-600">Payment Success Rate</div>
        <div className="mt-1 text-xs text-slate-500">
          {stats.completed} of {stats.total} payments
        </div>
      </div>
      {pieData.length > 0 && (
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#64748b"
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<PaymentTooltip total={stats.total} />} />
          </PieChart>
        </ResponsiveContainer>
      )}
      {pieData.length === 0 && (
        <div className="py-8 text-center text-sm text-slate-500">No payment data available</div>
      )}
    </div>
  );
}
