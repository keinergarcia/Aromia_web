import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  Plus,
  Search,
  RefreshCw,
  Ban,
  RotateCcw,
  Trash2,
  MonitorSmartphone,
  ChevronDown,
  ChevronUp,
  KeyRound,
  Users,
} from 'lucide-react'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { supabase } from '@/lib/supabase/client'
import {
  listLicenses,
  searchProfiles,
  updateLicense,
  deactivateDevice,
} from '@/lib/admin'
import type { LicenseWithRelations, Profile } from '@/types'
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
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function AdminIndex() {
  const [licenses, setLicenses] = useState<LicenseWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listLicenses({ q: q || undefined, status: status || undefined })
      setLicenses(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar las licencias')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const runAction = async (licenseId: string, action: 'suspend' | 'revoke' | 'reactivate' | 'renew') => {
    setBusy(true)
    setError(null)
    try {
      if (action === 'renew') {
        const days = window.prompt('Días de renovación (desde hoy):', '365')
        if (!days) {
          setBusy(false)
          return
        }
        const n = Number.parseInt(days, 10)
        if (!Number.isFinite(n) || n <= 0) throw new Error('Días inválidos')
        const expiresAt = new Date(Date.now() + n * 86400000).toISOString()
        await updateLicense(licenseId, 'renew', { expires_at: expiresAt })
      } else {
        await updateLicense(licenseId, action)
      }
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo actualizar la licencia')
    } finally {
      setBusy(false)
    }
  }

  const runDeactivate = async (licenseId: string, deviceId: string) => {
    if (!window.confirm('¿Desactivar este dispositivo y liberar el slot?')) return
    setBusy(true)
    setError(null)
    try {
      await deactivateDevice(licenseId, deviceId)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo desactivar el dispositivo')
    } finally {
      setBusy(false)
    }
  }

  const stats = useMemo(() => {
    const total = licenses.length
    const byStatus = licenses.reduce<Record<string, number>>((acc, l) => {
      acc[l.status] = (acc[l.status] ?? 0) + 1
      return acc
    }, {})
    return {
      total,
      active: byStatus.active ?? 0,
      suspended: byStatus.suspended ?? 0,
      expired: byStatus.expired ?? 0,
      revoked: byStatus.revoked ?? 0,
    }
  }, [licenses])

  return (
    <div>
      <PageHeader
        title="Licencias"
        description="Crea y administra las licencias de AROMIA Desktop"
        actions={
          <Button onClick={() => setShowCreate((v) => !v)} leftIcon={<Plus className="h-4 w-4" />}>
            Nueva licencia
          </Button>
        }
      />

      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {showCreate && (
        <div className="mb-6">
          <CreateLicenseForm
            onCreated={(key) => {
              setShowCreate(false)
              void load()
              window.alert(`Licencia creada con éxito:\n\n${key}\n\nEntrega esta clave al cliente.`)
            }}
            onError={(msg) => setError(msg)}
          />
        </div>
      )}

      {/* Resumen */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { label: 'Total', value: stats.total },
          { label: 'Activas', value: stats.active },
          { label: 'Suspendidas', value: stats.suspended },
          { label: 'Expiradas', value: stats.expired },
          { label: 'Revocadas', value: stats.revoked },
        ].map((s) => (
          <Card key={s.label} className="px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-slate-400">{s.label}</p>
            <p className="mt-1 text-2xl font-bold text-white">{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <Input
              icon={<Search className="h-4 w-4" />}
              placeholder="Buscar por email del cliente"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void load()
              }}
            />
          </div>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
            }}
            className="h-11 rounded-lg border border-white/15 bg-surface-800 px-3 text-sm text-slate-100 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
            aria-label="Filtrar por estado"
          >
            <option value="">Todas</option>
            <option value="active">Activas</option>
            <option value="pending">Pendientes</option>
            <option value="suspended">Suspendidas</option>
            <option value="expired">Expiradas</option>
            <option value="revoked">Revocadas</option>
          </select>
          <Button variant="outline" onClick={() => void load()} leftIcon={<RefreshCw className="h-4 w-4" />}>
            Aplicar
          </Button>
        </CardContent>
      </Card>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner size="lg" />
        </div>
      ) : licenses.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <KeyRound className="mx-auto mb-3 h-10 w-10 text-slate-500" />
            <p className="text-slate-300">No hay licencias</p>
            <p className="mt-1 text-sm text-slate-500">Crea la primera usando «Nueva licencia».</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {licenses.map((lic) => (
            <Card key={lic.id}>
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={lic.status} />
                    <span className="text-sm font-semibold text-white">
                      {lic.profiles?.email ?? 'Cliente desconocido'}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm text-slate-400">
                    Plan: {lic.plan} · Dispositivos: {lic.activation_count}/{lic.max_activations} · Vence:{' '}
                    {formatDate(lic.expires_at)} · Última validación: {formatDate(lic.last_validated_at)}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Emitida: {formatDate(lic.issued_at)} · Creada: {formatDate(lic.created_at)}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setExpanded(expanded === lic.id ? null : lic.id)}
                    leftIcon={expanded === lic.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  >
                    Dispositivos
                  </Button>
                  {lic.status === 'active' && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => void runAction(lic.id, 'renew')} disabled={busy}>
                        Renovar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => void runAction(lic.id, 'suspend')} disabled={busy}>
                        <Ban className="h-4 w-4" /> Suspender
                      </Button>
                    </>
                  )}
                  {lic.status === 'suspended' && (
                    <Button size="sm" variant="outline" onClick={() => void runAction(lic.id, 'reactivate')} disabled={busy}>
                      <RotateCcw className="h-4 w-4" /> Reactivar
                    </Button>
                  )}
                  {lic.status !== 'revoked' && (
                    <Button size="sm" variant="danger" onClick={() => void runAction(lic.id, 'revoke')} disabled={busy}>
                      <Trash2 className="h-4 w-4" /> Revocar
                    </Button>
                  )}
                </div>
              </CardContent>

              {expanded === lic.id && (
                <CardContent className="border-t border-white/10 pt-4">
                  <LicenceDevices licence={lic} onDeactivate={runDeactivate} busy={busy} />
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function LicenceDevices({
  licence,
  onDeactivate,
  busy,
}: {
  licence: LicenseWithRelations
  onDeactivate: (licenceId: string, deviceId: string) => void
  busy: boolean
}) {
  if (!licence.license_activations || licence.license_activations.length === 0) {
    return (
      <p className="flex items-center gap-2 text-sm text-slate-400">
        <MonitorSmartphone className="h-4 w-4" /> Sin dispositivos activados.
      </p>
    )
  }

  return (
    <ul className="space-y-2">
      {licence.license_activations.map((act) => (
        <li
          key={act.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-surface-800/50 px-4 py-3"
        >
          <div className="min-w-0">
            <p className="truncate text-sm text-white">
              {act.devices?.device_name ?? 'Dispositivo'}
              <span className="ml-2 text-xs text-slate-500">
                {act.devices?.os ?? ''} · {act.devices?.fingerprint?.slice(0, 12) ?? ''}…
              </span>
            </p>
            <p className="text-xs text-slate-400">
              Activado: {formatDate(act.activated_at)} · Última validación: {formatDate(act.last_validated_at)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={act.status} />
            {act.status === 'active' && (
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => void onDeactivate(licence.id, act.device_id)}
              >
                Desactivar
              </Button>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}

function CreateLicenseForm({
  onCreated,
  onError,
}: {
  onCreated: (licenseKey: string) => void
  onError: (msg: string) => void
}) {
  const [customerId, setCustomerId] = useState('')
  const [customerLabel, setCustomerLabel] = useState('')
  const [plan, setPlan] = useState<'perpetual' | 'annual'>('annual')
  const [maxActivations, setMaxActivations] = useState('1')
  const [years, setYears] = useState('1')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<Profile[]>([])
  const [creating, setCreating] = useState(false)

  const doSearch = async () => {
    if (!customerLabel.trim()) return
    setSearching(true)
    onError('')
    try {
      setResults(await searchProfiles(customerLabel.trim()))
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Error de búsqueda')
    } finally {
      setSearching(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!customerId) {
      onError('Selecciona un cliente de la búsqueda.')
      return
    }
    const max = Number.parseInt(maxActivations, 10)
    if (!Number.isFinite(max) || max < 1) {
      onError('Máximo de dispositivos inválido.')
      return
    }
    setCreating(true)
    onError('')
    try {
      const payload: Record<string, unknown> = {
        customer_id: customerId,
        plan,
        max_activations: max,
      }
      if (plan === 'annual') {
        const n = Number.parseInt(years, 10)
        if (!Number.isFinite(n) || n <= 0) throw new Error('Años inválidos')
        payload.expires_at = new Date(Date.now() + n * 365 * 86400000).toISOString()
      }
      const { data, error } = await supabase.functions.invoke('create-license', {
        body: JSON.stringify(payload),
      })
      if (error) throw new Error(error.message)
      const licenseKey = (data as { license_key?: string })?.license_key
      if (!licenseKey) throw new Error('No se recibió la clave')
      onCreated(licenseKey)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'No se pudo crear la licencia')
    } finally {
      setCreating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crear licencia</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">Cliente</label>
            <div className="flex gap-2">
              <Input
                placeholder="Email o nombre del cliente"
                value={customerLabel}
                onChange={(e) => setCustomerLabel(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => void doSearch()}
                loading={searching}
                leftIcon={!searching ? <Users className="h-4 w-4" /> : undefined}
              >
                Buscar
              </Button>
            </div>
            {results.length > 0 && (
              <div className="mt-2 max-h-48 space-y-1 overflow-auto rounded-lg border border-white/10 bg-surface-800 p-2">
                {results.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setCustomerId(p.id)
                      setCustomerLabel(p.email)
                      setResults([])
                    }}
                    className={cn(
                      'block w-full rounded-md px-3 py-2 text-left text-sm transition-colors',
                      customerId === p.id ? 'bg-primary-500/20 text-primary-100' : 'text-slate-300 hover:bg-white/5',
                    )}
                  >
                    {p.email}
                    {p.full_name ? <span className="ml-2 text-xs text-slate-500">{p.full_name}</span> : null}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">Plan</label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value as 'perpetual' | 'annual')}
                className="h-11 w-full rounded-lg border border-white/15 bg-surface-800 px-3 text-sm text-slate-100 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
              >
                <option value="annual">Anual</option>
                <option value="perpetual">Perpetua</option>
              </select>
            </div>
            <div>
              <Input
                label="Máx. dispositivos"
                type="number"
                min={1}
                value={maxActivations}
                onChange={(e) => setMaxActivations(e.target.value)}
              />
            </div>
            {plan === 'annual' && (
              <div>
                <Input
                  label="Duración (años)"
                  type="number"
                  min={1}
                  value={years}
                  onChange={(e) => setYears(e.target.value)}
                />
              </div>
            )}
          </div>
        </CardContent>
        <div className="flex justify-end gap-3 border-t border-white/10 px-6 py-4">
          <Button type="submit" loading={creating} leftIcon={!creating ? <Plus className="h-4 w-4" /> : undefined}>
            {creating ? 'Creando…' : 'Crear licencia'}
          </Button>
        </div>
      </form>
    </Card>
  )
}