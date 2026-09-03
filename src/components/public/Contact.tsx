import { Mail, MessageCircle, LifeBuoy } from 'lucide-react'
import { SectionHeading } from './SectionHeading'

const channels = [
  {
    icon: Mail,
    title: 'Correo electrónico',
    description: 'Para consultas y soporte.',
    value: 'keinergarciaortiz@gmail.com',
    href: 'mailto:keinergarciaortiz@gmail.com',
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp',
    description: 'Hablemos sobre AROMIA y tu proyecto.',
    value: '316 761 9309',
    href: 'https://wa.me/573167619309',
    external: true,
  },
  {
    icon: LifeBuoy,
    title: 'Soporte',
    description: 'Ayuda con la instalación y el uso del sistema.',
    value: 'Centro de ayuda',
    href: '#faq',
  },
]

export function Contact() {
  return (
    <section id="contacto" className="relative py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Contacto"
          title="Estamos para ayudarte"
          description="¿Tienes preguntas, sugerencias o necesitas soporte? Escríbenos."
        />

        <div className="mx-auto mt-16 grid max-w-4xl gap-6 sm:grid-cols-3">
          {channels.map((c) => (
            <a
              key={c.title}
              href={c.href}
              target={c.external ? '_blank' : undefined}
              rel={c.external ? 'noopener noreferrer' : undefined}
              className="group rounded-2xl border border-white/10 bg-surface-900/60 p-6 text-center transition-colors hover:border-primary-500/50"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary-500/15 text-primary-300 transition-colors group-hover:bg-primary-500 group-hover:text-white">
                <c.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-semibold text-white">{c.title}</h3>
              <p className="mt-1 text-sm text-slate-400">{c.description}</p>
              <p className="mt-3 min-w-0 break-words text-sm font-medium text-primary-300">
                {c.value}
              </p>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}