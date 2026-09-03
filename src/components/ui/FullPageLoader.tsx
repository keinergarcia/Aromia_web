import { Spinner } from './Spinner'

export function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-950">
      <div className="flex flex-col items-center gap-4 text-slate-400">
        <Spinner size="lg" />
        <p className="text-sm">Cargando…</p>
      </div>
    </div>
  )
}