import { Check } from 'lucide-react'
import { SectionHeading } from './SectionHeading'

const included = [
  {
    group: 'Operación diaria',
    items: [
      'Panel de inicio con resumen',
      'Registro de ventas',
      'Gestión de producción',
      'Control de inventario',
    ],
  },
  {
    group: 'Catálogo y control',
    items: [
      'Productos',
      'Presentaciones',
      'Categorías',
      'Historial de ventas, producción y movimientos',
    ],
  },
  {
    group: 'Reportes y sistema',
    items: [
      'Reportes',
      'Cierres mensuales',
      'Copias de seguridad',
      'Configuración y tema claro/oscuro',
    ],
  },
]

export function WhatIncludes() {
  return (
    <section id="que-incluye" className="relative py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="¿Qué incluye?"
          title="Los módulos que componen AROMIA"
          description="Un conjunto de secciones para administrar cada etapa de tu actividad aromática."
        />

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {included.map((group) => (
            <div
              key={group.group}
              className="rounded-2xl border border-white/10 bg-surface-900/60 p-7"
            >
              <h3 className="text-lg font-bold text-white">{group.group}</h3>
              <ul className="mt-5 space-y-3.5">
                {group.items.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-500/20">
                      <Check className="h-3 w-3 text-accent-300" />
                    </span>
                    <span className="text-sm text-slate-300">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}