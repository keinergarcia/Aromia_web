import { useState } from 'react'
import { Download, CheckCircle2, Monitor, Info } from 'lucide-react'
import { SectionHeading } from './SectionHeading'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import {
  APP_RELEASE,
  APP_TAGLINE,
  getDownloadStatus,
} from '@/lib/config'

export function DownloadCTA() {
  const [copied, setCopied] = useState(false)
  const status = getDownloadStatus(APP_RELEASE)

  const copyStatus = async () => {
    try {
      await navigator.clipboard.writeText('keinergarciaortiz@gmail.com')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section id="descarga" className="relative py-24">
      <div
        className="mx-auto max-w-5xl rounded-3xl border border-primary-500/30 bg-surface-900/90 px-4 py-16 text-center sm:px-8"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at top, rgba(124,58,237,0.25), transparent 60%), radial-gradient(ellipse at bottom, rgba(16,185,129,0.12), transparent 55%)',
        }}
      >
        <SectionHeading
          eyebrow="Descarga"
          title="Descargar AROMIA para Windows"
          description={APP_TAGLINE}
        />

        <div className="mt-8 flex justify-center">
          <div className="inline-flex items-center gap-3 rounded-full border border-accent-500/40 bg-accent-500/10 px-5 py-2 text-sm text-accent-200">
            <Monitor className="h-4 w-4" />
            Windows
            <span className="text-accent-400" aria-hidden="true">
              ·
            </span>
            <span>Versión {APP_RELEASE.version}</span>
            {APP_RELEASE.architecture && (
              <>
                <span className="text-accent-400" aria-hidden="true">
                  ·
                </span>
                <span>{APP_RELEASE.architecture}</span>
              </>
            )}
          </div>
        </div>

        <div className="mt-8">
          {status === 'download-ready' && APP_RELEASE.url ? (
            <a href={APP_RELEASE.url} target="_blank" rel="noopener noreferrer">
              <Button size="lg" leftIcon={<Download className="h-5 w-5" />}>
                Descargar ahora
              </Button>
            </a>
          ) : (
            <div className="mx-auto max-w-xl space-y-4">
              <Alert variant="info">
                El instalador oficial de AROMIA estará disponible próximamente.
                Esta sección se activará cuando se defina el mecanismo de
                distribución.
              </Alert>
              <button
                onClick={copyStatus}
                className="inline-flex items-center gap-2 text-sm font-medium text-primary-300 hover:text-primary-200"
              >
                {copied ? (
                  <CheckCircle2 className="h-4 w-4 text-accent-400" />
                ) : (
                  <Info className="h-4 w-4" />
                )}
                {copied
                  ? '¡Listo! Solicita el acceso en keinergarciaortiz@gmail.com'
                  : 'Saber más sobre la descarga'}
              </button>
            </div>
          )}
        </div>

        <p className="mt-8 text-xs text-slate-400">
          Requisitos: Windows de 64 bits (x64). Los detalles de versión, fecha,
          tamaño y cambios se publicarán junto con el instalador oficial.
        </p>
      </div>
    </section>
  )
}