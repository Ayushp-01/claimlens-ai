import React from 'react';
import { RiskPriority } from '@/types';
import { cn } from '@/lib/utils';
import { ShieldCheck, ShieldAlert, AlertTriangle, Flame } from 'lucide-react';

interface RiskScoreBadgeProps {
  score?: number;
  priority?: RiskPriority | string;
  showIcon?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function RiskScoreBadge({
  score,
  priority,
  showIcon = true,
  className,
  size = 'sm',
}: RiskScoreBadgeProps) {
  // Infer priority from score if not explicitly passed
  let resolvedPriority: RiskPriority = 'low';
  if (priority) {
    resolvedPriority = priority.toLowerCase() as RiskPriority;
  } else if (score !== undefined) {
    if (score >= 75) resolvedPriority = 'critical';
    else if (score >= 50) resolvedPriority = 'high';
    else if (score >= 25) resolvedPriority = 'medium';
    else resolvedPriority = 'low';
  }

  const styles = {
    low: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      icon: ShieldCheck,
      label: 'Low Risk',
      accent: 'bg-emerald-500',
    },
    medium: {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      icon: AlertTriangle,
      label: 'Medium Risk',
      accent: 'bg-amber-500',
    },
    high: {
      bg: 'bg-orange-50',
      text: 'text-orange-800',
      border: 'border-orange-200',
      icon: ShieldAlert,
      label: 'High Risk',
      accent: 'bg-orange-500',
    },
    critical: {
      bg: 'bg-rose-50',
      text: 'text-rose-800',
      border: 'border-rose-200',
      icon: Flame,
      label: 'Critical Risk',
      accent: 'bg-rose-600',
    },
  }[resolvedPriority] || {
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
    icon: ShieldCheck,
    label: 'Standard',
    accent: 'bg-slate-500',
  };

  const Icon = styles.icon;

  if (size === 'lg') {
    return (
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-2 rounded-xl border font-medium shadow-sm',
          styles.bg,
          styles.text,
          styles.border,
          className
        )}
      >
        {showIcon && <Icon className="h-6 w-6 shrink-0" />}
        <div>
          <div className="flex items-baseline gap-1.5">
            {score !== undefined && (
              <span className="text-2xl font-bold tracking-tight">{score}</span>
            )}
            <span className="text-xs font-semibold uppercase opacity-75">/ 100</span>
          </div>
          <span className="text-xs font-medium block capitalize">{styles.label}</span>
        </div>
      </div>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold shadow-2xs',
        styles.bg,
        styles.text,
        styles.border,
        className
      )}
    >
      {showIcon && <Icon className="h-3.5 w-3.5 shrink-0" />}
      {score !== undefined && <span>{score}/100 • </span>}
      <span className="capitalize">{styles.label}</span>
    </span>
  );
}
