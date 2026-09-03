import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { SectionHeading } from './SectionHeading'
import { cn } from '@/lib/cn'

const faqs = [
  {
    q: '¿Qué es AROMIA?',
    a: 'AROMIA es un sistema de gestión de escritorio para negocios que elaboran y venden productos aromáticos. Te ayuda a administrar materias primas, producción, inventario y ventas.',
  },
  {
    q: '¿En qué sistemas operativos funciona?',
    a: 'La versión actual de AROMIA está disponible para Windows. Se instala como una aplicación de escritorio en tu computador.',
  },
  {
    q: '¿Necesita conexión a Internet?',
    a: 'La información de AROMIA se guarda de forma local en tu propio equipo, por lo que el sistema funciona sin necesidad de conexión a Internet.',
  },
  {
    q: '¿Dónde se almacenan mis datos?',
    a: 'Todos tus datos se almacenan en una base de datos local en tu computador. Tú mantienes el control de tu información y puedes crear copias de seguridad.',
  },
  {
    q: '¿Cómo hago una copia de seguridad?',
    a: 'AROMIA incluye una función de copias de seguridad que te permite respaldar tu información y restaurarla posteriormente cuando lo necesites.',
  },
  {
    q: '¿Cómo se instala AROMIA?',
    a: 'AROMIA se instala como cualquier aplicación de escritorio en Windows. La guía de instalación se publicará junto con la versión oficial cuando esté disponible.',
  },
]

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section id="faq" className="relative py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Preguntas frecuentes"
          title="Resolvemos tus dudas"
          description="Las respuestas más comunes sobre AROMIA y su funcionamiento."
        />

        <div className="mt-14 space-y-3">
          {faqs.map((faq, i) => {
            const open = openIndex === i
            const panelId = `faq-panel-${i}`
            return (
              <div
                key={faq.q}
                className="overflow-hidden rounded-xl border border-white/10 bg-surface-900/60 transition-colors hover:border-white/20"
              >
                <button
                  onClick={() => setOpenIndex(open ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  aria-expanded={open}
                  aria-controls={panelId}
                >
                  <span className="font-medium text-white">{faq.q}</span>
                  <ChevronDown
                    className={cn(
                      'h-5 w-5 shrink-0 text-slate-400 transition-transform duration-300',
                      open && 'rotate-180 text-primary-300',
                    )}
                  />
                </button>
                <div
                  id={panelId}
                  className={cn(
                    'grid transition-all duration-300',
                    open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-5 text-sm leading-relaxed text-slate-400">
                      {faq.a}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}