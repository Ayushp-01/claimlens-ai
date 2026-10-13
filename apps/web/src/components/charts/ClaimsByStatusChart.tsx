'use client';

import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import { StatusData } from '@/types';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';

const DEFAULT_COLORS = ['#0d9488', '#14b8a6', '#f59e0b', '#818cf8', '#3b82f6', '#ef4444'];

interface ClaimsByStatusChartProps {
  data: StatusData[];
  isLoading?: boolean;
}

export function ClaimsByStatusChart({ data, isLoading }: ClaimsByStatusChartProps) {
  if (isLoading) {
    return <LoadingState message="Loading status chart..." className="h-72" />;
  }

  if (!data || data.length === 0) {
    return <EmptyState title="No status data" description="No claims to display." className="h-72" />;
  }

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
            dataKey="count"
            nameKey="status"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.fill || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload as StatusData;
                return (
                  <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-md">
                    <p className="text-xs font-semibold text-slate-800">{item.status}</p>
                    <p className="text-xs text-slate-600 mt-1">
                      Count: <span className="font-bold text-slate-900">{item.count}</span> ({item.percentage}%)
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => <span className="text-xs font-medium text-slate-700">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
