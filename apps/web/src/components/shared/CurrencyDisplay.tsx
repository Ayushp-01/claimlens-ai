import React from 'react';
import { formatINR } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface CurrencyDisplayProps {
  amount: number | string | null | undefined;
  className?: string;
  fractionDigits?: number;
}

export function CurrencyDisplay({
  amount,
  className,
  fractionDigits = 2,
}: CurrencyDisplayProps) {
  const formatted = formatINR(amount);

  return (
    <span className={cn('font-mono font-medium tracking-tight text-slate-900', className)}>
      {fractionDigits === 0 ? formatted.replace(/\.00$/, '') : formatted}
    </span>
  );
}
