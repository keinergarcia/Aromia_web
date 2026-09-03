import {
  Clock3,
  Lock,
  Zap,
  Smartphone,
  Gauge,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { SectionHeading } from './SectionHeading'

interface Benefit {
  icon: LucideIcon
  title: string
  description: string
}

const benefits: Benefit[] = [
  {
    icon: Zap,
    title: 'Ahorra tiempo',
    description:
      'Automatiza el registro de tus operaciones y evita tareas manuales repetitivas.',
  },
  {
    icon: Gauge,
    title: 'Control total',
    description:
      'Ten visibilidad clara de tu inventario, producción y ventas en todo momento.',
  },
  {
    icon: Lock,
    title: 'Tus datos, en tu equipo',
    description:
      'Tu información permanece en tu computador, bajo tu control y sin depender de la nube.',
  },
  {
    icon: Wallet,
    title: 'Sin costos de suscripción',
    description:
      'Una herramienta de escritorio para que el control de tu negocio no pese en tu presupuesto.',
  },
  {
    icon: Clock3,
    title: 'Rápida puesta en marcha',
    description:
      'Una interfaz clara y simple para que empieces a trabajar desde el primer día.',
  },
  {
    icon: Smartphone,
    title: 'Para tu emprendimiento',
    description:
      'Escalable y sencilla, pensada para el día a día de pequeños y medianos negocios.',
  },
]

export function Benefits() {
  return (
    <section id="beneficios" className="relative py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <SectionHeading
            align="left"
            eyebrow="Beneficios"
            title="Una herramienta que trabaja contigo"
            description="AROMIA está diseñada para simplificar la gestión de tu negocio aromático y darte tranquilidad."
          />

          <div className="grid gap-5 sm:grid-cols-2">
            {benefits.map((b) => (
              <div
                key={b.title}
                className="rounded-2xl border border-white/10 bg-surface-900/60 p-6 transition-colors hover:border-accent-500/50"
              >
                <b.icon className="h-6 w-6 text-accent-400" />
                <h3 className="mt-3 text-base font-semibold text-white">{b.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{b.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}