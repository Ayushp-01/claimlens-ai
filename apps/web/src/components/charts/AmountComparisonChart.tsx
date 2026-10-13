'use client';

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { AmountData } from '@/types';
import { formatINR } from '@/lib/utils';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';

interface AmountComparisonChartProps {
  data: AmountData[];
  isLoading?: boolean;
}

export function AmountComparisonChart({ data, isLoading }: AmountComparisonChartProps) {
  if (isLoading) {
    return <LoadingState message="Loading financial figures..." className="h-72" />;
  }

  if (!data || data.length === 0) {
    return <EmptyState title="No financial data" description="No monthly settlement data available." className="h-72" />;
  }

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="month"
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
          />
          <YAxis
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
            tickFormatter={(value) => `₹${(value / 100000).toFixed(0)}L`}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg min-w-44">
                    <p className="text-xs font-semibold text-slate-900 mb-1">{label}</p>
                    {payload.map((entry: any, index: number) => (
                      <div key={index} className="flex items-center justify-between gap-4 py-0.5 text-xs">
                        <span style={{ color: entry.color }} className="font-medium">
                          {entry.name}:
                        </span>
                        <span className="font-mono font-bold text-slate-900">
                          {formatINR(entry.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend
            verticalAlign="top"
            height={36}
            formatter={(value) => <span className="text-xs font-medium text-slate-700">{value}</span>}
          />
          <Bar dataKey="claimed" name="Claimed" fill="#1e3a8a" radius={[4, 4, 0, 0]} />
          <Bar dataKey="approved" name="Approved" fill="#14b8a6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="settled" name="Settled" fill="#0d9488" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
