import { Link } from 'react-router-dom'
import { Logo } from '@/components/ui/Logo'
import { LINKS } from '@/lib/config'

const footerLinks = [
  {
    title: 'Producto',
    items: [
      { label: 'Características', href: '#caracteristicas' },
      { label: 'Beneficios', href: '#beneficios' },
      { label: '¿Qué incluye?', href: '#que-incluye' },
      { label: 'Descargar', href: '#descarga' },
    ],
  },
  {
    title: 'Soporte',
    items: [
      { label: 'Preguntas frecuentes', href: '#faq' },
      { label: 'Contacto', href: '#contacto' },
      { label: 'Acceso', href: LINKS.signIn },
    ],
  },
]

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-surface-950">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <a href="#top" className="inline-block rounded-lg transition-opacity hover:opacity-80" aria-label="AROMIA — Inicio">
              <Logo size="sm" />
            </a>
            <p className="mt-4 max-w-sm text-sm text-slate-400">
              Sistema de gestión para productos aromáticos. Administra tu
              inventario, producción y ventas con una aplicación de escritorio
              profesional, moderna y segura.
            </p>
          </div>
          {footerLinks.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold text-white">{col.title}</h3>
              <ul className="mt-3 space-y-2">
                {col.items.map((item) => (
                  <li key={item.label}>
                    {item.href.startsWith('#') ? (
                      <a
                        href={item.href}
                        className="text-sm text-slate-400 transition-colors hover:text-white"
                      >
                        {item.label}
                      </a>
                    ) : (
                      <Link
                        to={item.href}
                        className="text-sm text-slate-400 transition-colors hover:text-white"
                      >
                        {item.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-slate-400 sm:flex-row">
          <p>© {new Date().getFullYear()} AROMIA. Todos los derechos reservados.</p>
          <p>AROMIA · Desarrollado por ElChivalez · Software de escritorio.</p>
        </div>
      </div>
    </footer>
  )
}