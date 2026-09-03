import { useEffect, useState } from 'react'
import { MonitorSmartphone, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { myDevices, deactivateOwnDevice, type MyDevice } from '@/lib/licenses'

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function MyDevices() {
  const [devices, setDevices] = useState<MyDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    setError(null)
    try {
      const data = await myDevices()
      setDevices(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar tus dispositivos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const handleDeactivate = async (activationLicenseId: string, fingerprint: string) => {
    if (!window.confirm('¿Desactivar este dispositivo? Liberarás un slot de tu licencia.')) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      await deactivateOwnDevice(activationLicenseId, fingerprint)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo desactivar el dispositivo')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Mis dispositivos" description="Equipos vinculados a tu cuenta" />
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      </div>
    )
  }

  if (devices.length === 0 && !error) {
    return (
      <div>
        <PageHeader title="Mis dispositivos" description="Equipos vinculados a tu cuenta" />
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-surface-900/70 px-6 py-16 text-center">
          <MonitorSmartphone className="h-10 w-10 text-slate-500" />
          <p className="text-sm font-medium text-white">Aún no tienes dispositivos</p>
          <p className="max-w-sm text-sm text-slate-400">
            Cuando actives AROMIA desde el escritorio, tus equipos aparecerán aquí para que
            puedas gestionarlos.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mis dispositivos"
        description={`${devices.length} ${devices.length === 1 ? 'dispositivo' : 'dispositivos'} vinculados`}
      />

      {error && <Alert variant="error">{error}</Alert>}

      {devices.map((device) => {
        const activeActivations = device.license_activations.filter(
          (a) => a.status === 'active',
        )
        return (
          <Card key={device.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2.5">
                <MonitorSmartphone className="h-4 w-4 text-primary-300" />
                <CardTitle>{device.device_name || 'Dispositivo'}</CardTitle>
              </div>
              <Badge variant={activeActivations.length > 0 ? 'success' : 'muted'}>
                {activeActivations.length > 0 ? 'Activo' : 'Inactivo'}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <span className="text-xs text-slate-400">Sistema</span>
                  <p className="font-medium text-white">{device.os || '—'}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Vinculado desde</span>
                  <p className="font-medium text-white">{formatDate(device.created_at)}</p>
                </div>
              </div>

              {device.license_activations.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-white">Licencias en este equipo</h3>
                  <ul className="space-y-2">
                    {device.license_activations.map((act) => (
                      <li
                        key={act.id}
                        className="flex items-center justify-between rounded-lg border border-white/10 bg-surface-800/60 px-4 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">
                            {act.licenses?.product || 'AROMIA'}
                          </p>
                          <p className="truncate text-xs text-slate-400">
                            Plan {act.licenses?.plan ?? '—'} · Vence {formatDate(act.licenses?.expires_at ?? null)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge
                            variant={
                              act.status === 'active' && act.licenses?.status === 'active'
                                ? 'success'
                                : 'muted'
                            }
                          >
                            {act.status === 'active' ? 'Activo' : 'Desactivado'}
                          </Badge>
                          {act.status === 'active' && act.licenses?.id && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={busy}
                              onClick={() =>
                                handleDeactivate(act.licenses!.id!, device.fingerprint)
                              }
                              className="flex items-center gap-1.5"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Desactivar
                            </Button>
                          )}
                        </div>
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
