import {
  LayoutDashboard,
  DollarSign,
  Factory,
  Package,
  Tags,
  Layers,
  FolderTree,
  History,
  FileBarChart,
  CalendarCheck,
  DatabaseBackup,
  Settings,
  HardDrive,
  Palette,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { SectionHeading } from './SectionHeading'

interface Feature {
  icon: LucideIcon
  title: string
  description: string
  core?: boolean
}

/**
 * Módulos con base en las vistas que realmente existen en AROMIA Desktop 1.0.0.
 * No se inventan funciones ni características futuras.
 */
const features: Feature[] = [
  {
    icon: LayoutDashboard,
    title: 'Panel de inicio',
    description:
      'Resumen de tu actividad al abrir el sistema para tener el control a un vistazo.',
    core: true,
  },
  {
    icon: DollarSign,
    title: 'Ventas',
    description: 'Registra tus ventas y consulta el historial de todas tus operaciones.',
    core: true,
  },
  {
    icon: Factory,
    title: 'Producción',
    description:
      'Gestiona tus producciones y consulta su historial completo.',
    core: true,
  },
  {
    icon: Package,
    title: 'Inventario',
    description:
      'Controla tus existencias, consulta su estado y registra los movimientos.',
    core: true,
  },
  {
    icon: Tags,
    title: 'Productos',
    description:
      'Mantén el catálogo de tus productos aromáticos organizado y actualizado.',
  },
  {
    icon: Layers,
    title: 'Presentaciones',
    description: 'Define las presentaciones y formatos en los que comercializas.',
  },
  {
    icon: FolderTree,
    title: 'Categorías',
    description: 'Clasifica tus productos por categorías para una gestión ordenada.',
  },
  {
    icon: History,
    title: 'Historiales',
    description:
      'Registro de ventas, producción y movimientos de inventario con detalle.',
  },
  {
    icon: FileBarChart,
    title: 'Reportes',
    description: 'Genera reportes de tu actividad y toma decisiones con información.',
  },
  {
    icon: CalendarCheck,
    title: 'Cierres mensuales',
    description: 'Organiza el corte de tu actividad por períodos mensuales.',
  },
  {
    icon: DatabaseBackup,
    title: 'Copias de seguridad',
    description:
      'Crea respaldos de tu información y restáurala cuando lo necesites.',
  },
  {
    icon: Settings,
    title: 'Configuración',
    description: 'Ajusta el sistema a tu forma de trabajar, incluyendo el tema.',
  },
]

export function Features() {
  return (
    <section id="caracteristicas" className="relative py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Características"
          title="Los módulos reales de AROMIA"
          description="Navegación basada en las secciones del sistema de escritorio: ventas, producción, inventario, catálogo, historiales, reportes y más."
        />

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-white/10 bg-surface-900/60 p-6 transition-colors duration-300 hover:border-primary-500/50"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-500/15 text-primary-300 transition-colors group-hover:bg-primary-500 group-hover:text-white">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {f.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-surface-900/40 px-5 py-4">
            <HardDrive className="h-5 w-5 shrink-0 text-accent-400" />
            <span className="text-sm text-slate-300">Datos 100% locales</span>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-surface-900/40 px-5 py-4">
            <Palette className="h-5 w-5 shrink-0 text-accent-400" />
            <span className="text-sm text-slate-300">Tema claro y oscuro</span>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-surface-900/40 px-5 py-4">
            <Users className="h-5 w-5 shrink-0 text-accent-400" />
            <span className="text-sm text-slate-300">Modo multiusuario</span>
          </div>
        </div>
      </div>
    </section>
  )
}