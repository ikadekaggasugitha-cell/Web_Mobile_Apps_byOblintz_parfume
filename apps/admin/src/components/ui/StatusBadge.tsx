import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  labels: Record<string, { label: string; color: string }>;
  fallbackColor?: string;
}

export function StatusBadge({ status, labels, fallbackColor = 'bg-gray-100 text-gray-800' }: StatusBadgeProps) {
  const entry = labels[status];

  return (
    <span
      className={cn(
        'inline-block rounded-full px-2 py-1 text-xs font-medium',
        entry?.color || fallbackColor
      )}
    >
      {entry?.label || status}
    </span>
  );
}
