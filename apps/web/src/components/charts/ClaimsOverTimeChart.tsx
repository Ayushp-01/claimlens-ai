'use client';

import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { TimeSeriesData } from '@/types';
import { formatINR } from '@/lib/utils';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';

interface ClaimsOverTimeChartProps {
  data: TimeSeriesData[];
  isLoading?: boolean;
}

export function ClaimsOverTimeChart({ data, isLoading }: ClaimsOverTimeChartProps) {
  if (isLoading) {
    return <LoadingState message="Loading trend data..." className="h-72" />;
  }

  if (!data || data.length === 0) {
    return <EmptyState title="No trend data" description="No claims logged for this timeframe." className="h-72" />;
  }

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="date"
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
          />
          <YAxis
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
                    <p className="text-xs font-semibold text-slate-900 mb-1">{label}</p>
                    {payload.map((entry: any, index: number) => (
                      <p key={index} className="text-xs flex items-center justify-between gap-4 py-0.5">
                        <span style={{ color: entry.color }} className="font-medium">
                          {entry.name}:
                        </span>
                        <span className="font-bold text-slate-800">
                          {entry.dataKey === 'amount'
                            ? formatINR(entry.value)
                            : entry.value}
                        </span>
                      </p>
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
          <Line
            type="monotone"
            dataKey="claimsCount"
            name="Total Claims"
            stroke="#1e3a8a"
            strokeWidth={2.5}
            dot={{ r: 3, fill: '#1e3a8a' }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="flaggedCount"
            name="Flagged / High Risk"
            stroke="#14b8a6"
            strokeWidth={2}
            dot={{ r: 3, fill: '#14b8a6' }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
