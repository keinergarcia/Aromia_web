import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

export function NotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
      <p className="text-7xl font-black text-primary-500/40">404</p>
      <h1 className="mt-4 text-2xl font-bold text-white">Página no encontrada</h1>
      <p className="mt-2 text-slate-400">
        La página que buscas no existe o fue movida.
      </p>
      <Link to="/" className="mt-8">
        <Button>Volver al inicio</Button>
      </Link>
    </div>
  )
}