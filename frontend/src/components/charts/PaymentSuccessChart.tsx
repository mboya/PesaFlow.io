'use client';

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
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

const COLORS = {
  completed: '#10b981', // green
  refunded: '#f59e0b', // amber
  disputed: '#ef4444', // red
  other: '#94a3b8', // gray
};

export function PaymentSuccessChart({ successRate, stats }: PaymentSuccessChartProps) {
  const pieData = [
    { name: 'Completed', value: stats.completed, color: COLORS.completed },
    { name: 'Refunded', value: stats.refunded, color: COLORS.refunded },
    { name: 'Disputed', value: stats.disputed, color: COLORS.disputed },
  ].filter((item) => item.value > 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = stats.total > 0 ? ((data.value / stats.total) * 100).toFixed(1) : 0;
      return (
        <div className="rounded-lg bg-white border border-zinc-200 shadow-lg p-3">
          <p className="text-sm font-medium text-zinc-900">{data.name}</p>
          <p className="text-sm" style={{ color: data.payload.color }}>
            {data.value} ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="text-3xl font-bold text-zinc-900">{successRate}%</div>
        <div className="text-sm text-zinc-600">Payment Success Rate</div>
        <div className="text-xs text-zinc-500 mt-1">
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
              fill="#8884d8"
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      )}
      {pieData.length === 0 && (
        <div className="text-center text-zinc-500 text-sm py-8">No payment data available</div>
      )}
    </div>
  );
}
