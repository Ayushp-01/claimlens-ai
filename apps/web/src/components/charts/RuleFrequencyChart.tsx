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
import { RuleData } from '@/types';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';

const SEVERITY_COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#10b981',
};

interface RuleFrequencyChartProps {
  data: RuleData[];
  isLoading?: boolean;
}

export function RuleFrequencyChart({ data, isLoading }: RuleFrequencyChartProps) {
  if (isLoading) {
    return <LoadingState message="Loading rule trigger data..." className="h-72" />;
  }

  if (!data || data.length === 0) {
    return <EmptyState title="No rules data" description="No risk rules triggered." className="h-72" />;
  }

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
          <XAxis type="number" stroke="#64748b" fontSize={12} tickLine={false} />
          <YAxis
            type="category"
            dataKey="ruleId"
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
            width={100}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload as RuleData;
                return (
                  <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-md max-w-xs">
                    <p className="text-xs font-semibold text-slate-900">{item.ruleName}</p>
                    <p className="text-2xs text-slate-500 font-mono mt-0.5">{item.ruleId}</p>
                    <div className="flex items-center justify-between gap-4 mt-2 text-xs">
                      <span className="text-slate-600">Triggers:</span>
                      <span className="font-bold text-slate-900">{item.count}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 mt-0.5 text-xs">
                      <span className="text-slate-600">Severity:</span>
                      <span className="font-semibold capitalize" style={{ color: SEVERITY_COLORS[item.severity] || '#64748b' }}>
                        {item.severity}
                      </span>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="count" name="Triggers" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={SEVERITY_COLORS[entry.severity] || '#1e3a8a'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
