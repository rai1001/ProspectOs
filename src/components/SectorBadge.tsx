import { cn } from '../lib/cn'
import { SECTOR_COLORS, type Sector } from '../constants/sectors'

interface Props {
  sector: Sector | string
  className?: string
}

export function SectorBadge({ sector, className }: Props) {
  const color = SECTOR_COLORS[sector as Sector] ?? 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30'

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium',
        color,
        className,
      )}
    >
      {sector}
    </span>
  )
}
