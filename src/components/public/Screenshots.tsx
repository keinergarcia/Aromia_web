import { SectionHeading } from './SectionHeading'
import {
  Home,
  FlaskConical,
  Boxes,
  Factory,
  ShoppingCart,
  BarChart3,
  Settings,
  Bell,
  Search,
} from 'lucide-react'

/**
 * Vista previa representativa de la interfaz de AROMIA Desktop.
 * Es una maqueta ilustrativa (no una captura real); las capturas oficiales
 * se incorporarán cuando sean proporcionadas.
 */
export function Screenshots() {
  const navItems = [
    { icon: Home, label: 'Inicio', active: true },
    { icon: FlaskConical, label: 'Productos' },
    { icon: Boxes, label: 'Materiales' },
    { icon: Factory, label: 'Producción' },
    { icon: ShoppingCart, label: 'Ventas' },
    { icon: BarChart3, label: 'Estadísticas' },
    { icon: Settings, label: 'Configuración' },
  ]

  const summary = [
    { label: 'Productos activos', value: '—' },
    { label: 'Ventas del mes', value: '—' },
    { label: 'En producción', value: '—' },
  ]

  return (
    <section id="capturas" className="relative py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Vista previa"
          title="Una interfaz limpia y moderna"
          description="Maqueta representativa de la aplicación de escritorio. Las capturas oficiales se incorporarán próximamente."
        />

        <div className="mx-auto mt-16 max-w-5xl">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-surface-900 shadow-2xl">
            {/* Barra de ventana */}
            <div className="flex items-center gap-2 border-b border-white/10 bg-surface-800 px-4 py-3">
              <span className="h-3 w-3 rounded-full bg-red-500/70" />
              <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
              <span className="h-3 w-3 rounded-full bg-green-500/70" />
              <span className="ml-3 flex-1 rounded-md bg-surface-950/60 px-3 py-1 text-xs text-slate-400">
                AROMIA — Sistema de Gestión
              </span>
              <Bell className="h-4 w-4 text-slate-500" />
              <Search className="h-4 w-4 text-slate-500" />
            </div>

            <div className="flex">
              {/* Sidebar */}
              <aside className="hidden w-48 shrink-0 border-r border-white/10 bg-surface-950/50 p-3 sm:block">
                {navItems.map((n) => (
                  <div
                    key={n.label}
                    className={
                      'mb-1 flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium ' +
                      (n.active
                        ? 'bg-primary-500/20 text-primary-200'
                        : 'text-slate-400')
                    }
                  >
                    <n.icon className="h-4 w-4" />
                    {n.label}
                  </div>
                ))}
              </aside>

              {/* Contenido */}
              <div className="flex-1 p-5">
                <h3 className="text-sm font-semibold text-white">Panel de inicio</h3>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {summary.map((s) => (
                    <div
                      key={s.label}
                      className="rounded-xl border border-white/10 bg-surface-800/60 p-3"
                    >
                      <p className="text-lg font-bold text-primary-300">{s.value}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 h-40 rounded-xl border border-white/10 bg-gradient-to-br from-primary-500/10 to-accent-500/10 p-4">
                  <p className="text-xs text-slate-400">
                    Vista previa de estadísticas y reportes. Las capturas
                    oficiales se añadirán próximamente.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}