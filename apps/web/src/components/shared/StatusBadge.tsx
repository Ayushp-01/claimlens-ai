import React from 'react';
import { ClaimStatus } from '@/types';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: ClaimStatus | string;
  className?: string;
  size?: 'sm' | 'md';
}

const statusConfig: Record<
  string,
  { label: string; bg: string; text: string; dot: string; border: string }
> = {
  submitted: {
    label: 'Submitted',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
    border: 'border-blue-200',
  },
  validation: {
    label: 'In Validation',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    dot: 'bg-indigo-500',
    border: 'border-indigo-200',
  },
  risk_screening: {
    label: 'Risk Screening',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    dot: 'bg-purple-500',
    border: 'border-purple-200',
  },
  under_review: {
    label: 'Under Review',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    dot: 'bg-amber-500',
    border: 'border-amber-200',
  },
  documentation_requested: {
    label: 'Action Required',
    bg: 'bg-orange-50',
    text: 'text-orange-800',
    dot: 'bg-orange-500',
    border: 'border-orange-200',
  },
  approved: {
    label: 'Approved',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
    border: 'border-emerald-200',
  },
  partially_approved: {
    label: 'Partially Approved',
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    dot: 'bg-teal-500',
    border: 'border-teal-200',
  },
  rejected: {
    label: 'Rejected',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    dot: 'bg-rose-500',
    border: 'border-rose-200',
  },
  payment_processing: {
    label: 'Payment In Process',
    bg: 'bg-cyan-50',
    text: 'text-cyan-800',
    dot: 'bg-cyan-500',
    border: 'border-cyan-200',
  },
  settled: {
    label: 'Settled',
    bg: 'bg-emerald-100',
    text: 'text-emerald-900',
    dot: 'bg-emerald-600',
    border: 'border-emerald-300',
  },
};

export function StatusBadge({ status, className, size = 'sm' }: StatusBadgeProps) {
  const normKey = status.toLowerCase();
  const config = statusConfig[normKey] || {
    label: status.replace(/_/g, ' '),
    bg: 'bg-slate-100',
    text: 'text-slate-800',
    dot: 'bg-slate-500',
    border: 'border-slate-200',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full border shadow-2xs capitalize',
        config.bg,
        config.text,
        config.border,
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm font-semibold',
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', config.dot)} />
      {config.label}
    </span>
  );
}
