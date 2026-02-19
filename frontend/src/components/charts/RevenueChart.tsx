'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface RevenueChartProps {
  data: Array<{ date: string; revenue: number }>;
}

interface RevenueTooltipProps {
  active?: boolean;
  payload?: Array<{
    value?: number;
    payload?: {
      date?: string;
    };
  }>;
}

function RevenueTooltip({ active, payload }: RevenueTooltipProps) {
  const first = payload?.[0];
  const value = typeof first?.value === 'number' ? first.value : null;
  const date = first?.payload?.date;

  if (!active || value === null || !date) {
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 p-3 shadow-[0_16px_32px_-24px_rgba(15,23,42,.6)]">
      <p className="text-sm font-medium text-slate-900">{date}</p>
      <p className="text-sm font-semibold text-teal-700">
        KES {value.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
    </div>
  );
}

export function RevenueChart({ data }: RevenueChartProps) {
  // Format data for display - show last 14 days or all if less
  const displayData = data.slice(-14).map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    revenue: item.revenue,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={displayData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#dbe4ee" />
        <XAxis
          dataKey="date"
          stroke="#64748b"
          style={{ fontSize: '12px' }}
          tickLine={false}
        />
        <YAxis
          stroke="#64748b"
          style={{ fontSize: '12px' }}
          tickLine={false}
          tickFormatter={(value) => `KES ${(value / 1000).toFixed(0)}k`}
        />
        <Tooltip content={<RevenueTooltip />} />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke="#0f766e"
          strokeWidth={2}
          dot={{ fill: '#0f766e', r: 3.5 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
