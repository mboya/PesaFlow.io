'use client';

import React from 'react';
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

export function SubscriptionGrowthChart({ data }: SubscriptionGrowthChartProps) {
  // Format data for display - show last 14 days or all if less
  const displayData = data.slice(-14).map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    count: item.count,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg bg-white border border-zinc-200 shadow-lg p-3">
          <p className="text-sm font-medium text-zinc-900">{payload[0].payload.date}</p>
          <p className="text-sm text-purple-600 font-semibold">
            {payload[0].value} new {payload[0].value === 1 ? 'subscription' : 'subscriptions'}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={displayData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#a855f7" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
        <XAxis
          dataKey="date"
          stroke="#71717a"
          style={{ fontSize: '12px' }}
          tickLine={false}
        />
        <YAxis
          stroke="#71717a"
          style={{ fontSize: '12px' }}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="count"
          stroke="#a855f7"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorCount)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
