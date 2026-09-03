import type { ReactNode } from 'react'
import { CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react'
import { cn } from '@/lib/cn'

type AlertVariant = 'success' | 'error' | 'info' | 'warning'

const config: Record<
  AlertVariant,
  { icon: typeof Info; classes: string; iconClasses: string }
> = {
  success: {
    icon: CheckCircle2,
    classes: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
    iconClasses: 'text-emerald-400',
  },
  error: {
    icon: XCircle,
    classes: 'border-red-500/30 bg-red-500/10 text-red-200',
    iconClasses: 'text-red-400',
  },
  info: {
    icon: Info,
    classes: 'border-primary-500/30 bg-primary-500/10 text-primary-200',
    iconClasses: 'text-primary-400',
  },
  warning: {
    icon: AlertTriangle,
    classes: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
    iconClasses: 'text-amber-400',
  },
}

interface AlertProps {
  variant?: AlertVariant
  children: ReactNode
  className?: string
}

export function Alert({ variant = 'info', children, className }: AlertProps) {
  const { icon: Icon, classes, iconClasses } = config[variant]
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={cn('flex items-start gap-3 rounded-lg border px-4 py-3 text-sm', classes, className)}
    >
      <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', iconClasses)} />
      <div className="min-w-0">{children}</div>
    </div>
  )
}