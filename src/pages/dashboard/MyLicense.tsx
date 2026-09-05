import { useEffect, useState } from 'react'
import { KeyRound, MonitorSmartphone, CalendarDays, Activity, Copy, Check } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { myLicenses, type MyLicense } from '@/lib/licenses'
import { cn } from '@/lib/cn'

const STATUS_STYLE: Record<string, { label: string; variant: 'default' | 'success' | 'muted' }> = {
  active: { label: 'Activa', variant: 'success' },
  pending: { label: 'Pendiente', variant: 'muted' },
  suspended: { label: 'Suspendida', variant: 'default' },
  expired: { label: 'Expirada', variant: 'muted' },
  revoked: { label: 'Revocada', variant: 'muted' },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_STYLE[status] ?? { label: status, variant: 'muted' as const }
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>
}

function formatDate(iso: string | null): string {
  if (!iso) return 'Perpetua'
  return new Date(iso).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function MyLicense() {
  const [licenses, setLicenses] = useState<MyLicense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const copyKey = async (lic: MyLicense) => {
    if (!lic.license_key) return
    try {
      await navigator.clipboard.writeText(lic.license_key)
      setCopiedId(lic.id)
      window.setTimeout(() => setCopiedId((c) => (c === lic.id ? null : c)), 1500)
    } catch {
      setError('No se pudo copiar la clave')
    }
  }

  useEffect(() => {
    let mounted = true
    myLicenses()
      .then((data) => {
        if (mounted) setLicenses(data)
      })
      .catch((e: unknown) => {
        if (mounted) setError(e instanceof Error ? e.message : 'No se pudieron cargar tus licencias')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  if (loading) {
    return (
      <div>
        <PageHeader title="Mi licencia" description="Información sobre tu licencia de AROMIA" />
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Mi licencia" description="Información sobre tu licencia de AROMIA" />
        <Alert variant="error">{error}</Alert>
      </div>
    )
  }

  if (licenses.length === 0) {
    return (
      <div>
        <PageHeader title="Mi licencia" description="Información sobre tu licencia de AROMIA" />
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-surface-900/70 px-6 py-16 text-center">
          <KeyRound className="h-10 w-10 text-slate-500" />
          <p className="text-sm font-medium text-white">Aún no tienes licencias</p>
          <p className="max-w-sm text-sm text-slate-400">
            Cuando un administrador te asigne una licencia de AROMIA, verás aquí su estado,
            plan y vencimiento.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mi licencia"
        description={`${licenses.length} ${licenses.length === 1 ? 'licencia' : 'licencias'} en tu cuenta`}
      />

      {licenses.map((lic) => {
        const activeCount = lic.license_activations.filter(
          (a) => a.status === 'active',
        ).length
        return (
          <Card key={lic.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{lic.product}</CardTitle>
              <StatusBadge status={lic.status} />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <InfoItem
                  icon={Activity}
                  label="Plan"
                  value={lic.plan === 'perpetual' ? 'Perpetuo' : 'Anual'}
                />
                <InfoItem
                  icon={CalendarDays}
                  label="Vencimiento"
                  value={formatDate(lic.expires_at)}
                />
                <InfoItem
                  icon={MonitorSmartphone}
                  label="Activaciones"
                  value={`${activeCount} / ${lic.max_activations} dispositivos`}
                />
                <InfoItem
                  icon={KeyRound}
                  label="Emisión"
                  value={formatDate(lic.issued_at)}
                />
              </div>

              {lic.license_key && (
                <div className="flex flex-col gap-1.5 rounded-xl border border-white/10 bg-surface-800/60 p-4">
                  <span className="text-xs text-slate-400">Tu clave de licencia</span>
                  <div className="flex items-center gap-2">
                    <code className="min-w-0 flex-1 truncate font-mono text-sm font-semibold text-white">
                      {lic.license_key}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void copyKey(lic)}
                      leftIcon={
                        copiedId === lic.id ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )
                      }
                    >
                      {copiedId === lic.id ? 'Copiada' : 'Copiar'}
                    </Button>
                  </div>
                </div>
              )}

              {lic.license_activations.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-white">Dispositivos vinculados</h3>
                  <ul className="space-y-2">
                    {lic.license_activations.map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center justify-between rounded-lg border border-white/10 bg-surface-800/60 px-4 py-2.5"
                      >
                        <div className="flex items-center gap-2.5">
                          <MonitorSmartphone className="h-4 w-4 text-slate-400" />
                          <span className="text-sm text-white">
                            {a.devices?.device_name || 'Dispositivo'}
                          </span>
                        </div>
                        <span
                          className={cn(
                            'text-xs font-medium',
                            a.status === 'active' ? 'text-emerald-300' : 'text-slate-400',
                          )}
                        >
                          {a.status === 'active' ? 'Activo' : 'Desactivado'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-surface-800/60 p-4">
      <div className="flex items-center gap-2 text-slate-400">
        <Icon className="h-4 w-4" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-2 truncate text-sm font-semibold text-white">{value}</p>
    </div>
  )
}
