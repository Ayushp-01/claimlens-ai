import React from 'react';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({
  message = 'Loading data...',
  className,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-12 text-center rounded-xl bg-white border border-dashed border-slate-200',
        className
      )}
    >
      <Spinner size="lg" className="mb-3 text-navy-600" />
      <p className="text-sm font-medium text-slate-600">{message}</p>
    </div>
  );
}
