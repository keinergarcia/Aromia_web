import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

interface ComingSoonSectionProps {
  icon: LucideIcon
  title: string
  description: string
}

/**
 * Sección placeholder para módulos que pertenecen a fases posteriores.
 * No inventa información: declara explícitamente que está próximamente.
 */
export function ComingSoonSection({
  icon: Icon,
  title,
  description,
}: ComingSoonSectionProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center px-8 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary-500/25 bg-primary-500/15">
          <Icon className="h-7 w-7 text-primary-300" />
        </div>
        <h2 className="mt-5 text-lg font-semibold text-white">{title}</h2>
        <p className="mt-2 max-w-md text-sm text-slate-400">{description}</p>
        <Badge variant="muted" className="mt-5">
          Próximamente
        </Badge>
      </CardContent>
    </Card>
  )
}