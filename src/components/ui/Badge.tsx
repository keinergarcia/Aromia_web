import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type BadgeVariant = 'default' | 'success' | 'muted'

const variants: Record<BadgeVariant, string> = {
  default: 'border-primary-500/40 bg-primary-500/15 text-primary-200',
  success: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200',
  muted: 'border-white/10 bg-surface-800 text-slate-400',
}

export function Badge({
  className,
  variant = 'default',
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}