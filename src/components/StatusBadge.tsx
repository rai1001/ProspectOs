import { cn } from '../lib/cn'
import { STATUS_COLORS, STATUS_LABELS, type LeadStatus } from '../constants/statuses'

interface Props {
  status: LeadStatus
  className?: string
}

export function StatusBadge({ status, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium',
        STATUS_COLORS[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
