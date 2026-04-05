import { cn } from '../lib/cn'
import { scoreBgColor } from '../utils/scoring'

interface Props {
  score: number
  size?: 'sm' | 'md' | 'lg'
}

export function ScoreBadge({ score, size = 'md' }: Props) {
  const sizeClass = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  }[size]

  return (
    <div
      className={cn(
        'rounded-full border font-mono font-semibold flex items-center justify-center flex-shrink-0',
        sizeClass,
        scoreBgColor(score),
      )}
    >
      {score}
    </div>
  )
}
