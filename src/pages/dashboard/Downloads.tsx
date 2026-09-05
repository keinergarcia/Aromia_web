import { Monitor, Download, Package, Clock, HardDrive, FileText } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { APP_RELEASE, getDownloadStatus } from '@/lib/config'

const infoRows = [
  { icon: Monitor, label: 'Plataforma', value: 'Windows' },
  { icon: Package, label: 'Arquitectura', value: APP_RELEASE.architecture },
  {
    icon: Clock,
    label: 'Fecha de publicación',
    value: APP_RELEASE.publishedAt
      ? new Date(APP_RELEASE.publishedAt).toLocaleDateString('es-ES')
      : 'Por confirmar',
  },
  { icon: HardDrive, label: 'Tamaño', value: APP_RELEASE.size ?? 'Por confirmar' },
]

export function Downloads() {
  const status = getDownloadStatus(APP_RELEASE)
  const ready = status === 'download-ready'

  return (
    <div>
      <PageHeader
        title="Descargas"
        description="Descarga AROMIA para Windows"
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>AROMIA — Versión {APP_RELEASE.version}</CardTitle>
          <Badge variant={ready ? 'success' : 'muted'}>
            {ready ? 'Disponible' : 'Próximamente'}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-6">
          {ready ? (
            <Alert variant="success">
              AROMIA {APP_RELEASE.version} está disponible para descargar e
              instalar en Windows.
            </Alert>
          ) : (
            <Alert variant="info">
              El instalador oficial de AROMIA estará disponible próximamente.
              Cuando se defina el mecanismo de distribución, esta sección mostrará
              el enlace de descarga.
            </Alert>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {infoRows.map((row) => (
              <div
                key={row.label}
                className="rounded-xl border border-white/10 bg-surface-800/60 p-4"
              >
                <div className="flex items-center gap-2 text-slate-400">
                  <row.icon className="h-4 w-4" />
                  <span className="text-xs">{row.label}</span>
                </div>
                <p className="mt-2 truncate text-sm font-semibold text-white">
                  {row.value}
                </p>
              </div>
            ))}
          </div>

          {APP_RELEASE.changelog.length > 0 && (
            <div>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
                <FileText className="h-4 w-4 text-primary-300" /> Cambios de esta versión
              </h3>
              <ul className="space-y-1.5">
                {APP_RELEASE.changelog.map((c) => (
                  <li key={c} className="text-sm text-slate-400">
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="border-t border-white/10 pt-5">
            {ready && APP_RELEASE.url ? (
              <a href={APP_RELEASE.url} target="_blank" rel="noopener noreferrer">
                <Button leftIcon={<Download className="h-4 w-4" />}>
                  Descargar AROMIA
                </Button>
              </a>
            ) : (
              <Button disabled leftIcon={<Download className="h-4 w-4" />}>
                Descarga no disponible aún
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}