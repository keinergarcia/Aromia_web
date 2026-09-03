import { ArrowRight, Download, Sparkles, ShieldCheck, Cpu, WifiOff } from 'lucide-react'
import { AuroraBackground } from './AuroraBackground'
import { Button } from '@/components/ui/Button'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { LINKS } from '@/lib/config'

const heroHighlights = [
  { icon: WifiOff, text: 'Funciona offline' },
  { icon: Cpu, text: 'Datos locales' },
  { icon: ShieldCheck, text: 'Rápido y seguro' },
]

export function Hero() {
  const navigate = useNavigate()
  const { user } = useAuth()

  return (
    <section className="relative overflow-hidden">
      <AuroraBackground />
      <div className="relative mx-auto flex max-w-7xl flex-col items-center px-4 pb-24 pt-20 text-center sm:px-6 sm:pt-28 lg:px-8">
        <span className="animate-fade-in inline-flex items-center gap-2 rounded-full border border-primary-500/30 bg-primary-500/10 px-4 py-1.5 text-xs font-medium text-primary-200">
          <Sparkles className="h-3.5 w-3.5" />
          Gestión profesional para tu emprendimiento
        </span>

        <h1 className="animate-fade-up mt-8 max-w-4xl text-4xl font-black leading-tight tracking-tight text-white sm:text-6xl">
          Producción, gestión y ventas{' '}
          <span className="bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
            Todo integrado en un solo lugar.
          </span>
        </h1>

        <p className="animate-fade-up mt-6 max-w-2xl text-lg text-slate-300 sm:text-xl">
          AROMIA es un sistema de escritorio pensado para quienes elaboran
          productos aromáticos: gestiona materias primas, recetas, inventario,
          ventas y estadísticas con datos 100% locales.
        </p>

        <div className="animate-fade-up mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <a href="#descarga">
            <Button size="lg" leftIcon={<Download className="h-5 w-5" />}>
              Descargar AROMIA
            </Button>
          </a>
          <a href="#caracteristicas">
            <Button size="lg" variant="outline" leftIcon={<ArrowRight className="h-5 w-5" />}>
              Conocer el sistema
            </Button>
          </a>
        </div>

        <div className="animate-fade-up mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-slate-400">
          {heroHighlights.map((h) => (
            <span key={h.text} className="flex items-center gap-2">
              <h.icon className="h-4 w-4 text-accent-400" />
              {h.text}
            </span>
          ))}
        </div>

        {user === null && (
          <p className="animate-fade-up mt-8 text-sm text-slate-400">
            ¿Ya tienes una cuenta?{' '}
            <button
              onClick={() => navigate(LINKS.signIn)}
              className="font-semibold text-primary-300 hover:text-primary-200"
            >
              Inicia sesión
            </button>
          </p>
        )}
      </div>
    </section>
  )
}