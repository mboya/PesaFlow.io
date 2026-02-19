'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface SubscriptionGrowthChartProps {
  data: Array<{ date: string; count: number }>;
}

interface SubscriptionTooltipProps {
  active?: boolean;
  payload?: Array<{
    value?: number;
    payload?: {
      date?: string;
    };
  }>;
}

function SubscriptionTooltip({ active, payload }: SubscriptionTooltipProps) {
  const first = payload?.[0];
  const value = typeof first?.value === 'number' ? first.value : null;
  const date = first?.payload?.date;

  if (!active || value === null || !date) {
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 p-3 shadow-[0_16px_32px_-24px_rgba(15,23,42,.6)]">
      <p className="text-sm font-medium text-slate-900">{date}</p>
      <p className="text-sm font-semibold text-cyan-700">
        {value} new {value === 1 ? 'subscription' : 'subscriptions'}
      </p>
    </div>
  );
}

export function SubscriptionGrowthChart({ data }: SubscriptionGrowthChartProps) {
  const displayData = data.slice(-14).map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    count: item.count,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={displayData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0891b2" stopOpacity={0.72} />
            <stop offset="95%" stopColor="#0891b2" stopOpacity={0.08} />
          </linearGradient>
        </defs>
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
        />
        <Tooltip content={<SubscriptionTooltip />} />
        <Area
          type="monotone"
          dataKey="count"
          stroke="#0891b2"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorCount)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
