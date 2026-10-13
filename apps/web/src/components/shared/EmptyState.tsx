import React from 'react';
import { LucideIcon, FolderSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon = FolderSearch,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-12 text-center rounded-xl bg-white border border-dashed border-slate-200',
        className
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-50 text-navy-700 mb-4">
        <Icon className="h-7 w-7" />
      </div>
      <h4 className="text-base font-semibold text-slate-900">{title}</h4>
      <p className="mt-1 text-sm text-slate-500 max-w-sm">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-5" variant="default" size="sm">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
