import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/Card'

interface AuthCardProps {
  title: string
  subtitle?: string
  children: ReactNode
}

export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <Card className="p-2 shadow-2xl">
      <CardContent className="px-7 py-8">
        <h1 className="text-center text-2xl font-bold text-white">{title}</h1>
        {subtitle && (
          <p className="mt-2 text-center text-sm text-slate-400">{subtitle}</p>
        )}
        <div className="mt-7">{children}</div>
      </CardContent>
    </Card>
  )
}