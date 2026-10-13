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
  Cell,
} from 'recharts';
import { RiskData } from '@/types';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';

const RISK_LEVEL_COLORS = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
};

interface RiskDistributionChartProps {
  data: RiskData[];
  isLoading?: boolean;
}

export function RiskDistributionChart({ data, isLoading }: RiskDistributionChartProps) {
  if (isLoading) {
    return <LoadingState message="Loading risk distribution..." className="h-72" />;
  }

  if (!data || data.length === 0) {
    return <EmptyState title="No risk data" description="No risk scores evaluated yet." className="h-72" />;
  }

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="range"
            stroke="#64748b"
            fontSize={11}
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
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload as RiskData;
                return (
                  <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-md">
                    <p className="text-xs font-semibold text-slate-800">{item.range}</p>
                    <p className="text-xs text-slate-600 mt-1">
                      Claims: <span className="font-bold text-slate-900">{item.count}</span>
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="count" name="Claims" radius={[6, 6, 0, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`bar-${index}`}
                fill={entry.fill || RISK_LEVEL_COLORS[entry.level] || '#1e3a8a'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
