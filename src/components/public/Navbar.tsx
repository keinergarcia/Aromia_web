import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, X, Download, ArrowRight } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import { LINKS } from '@/lib/config'
import { cn } from '@/lib/cn'

const NAV_LINKS = [
  { href: '#caracteristicas', label: 'Características' },
  { href: '#beneficios', label: 'Beneficios' },
  { href: '#que-incluye', label: '¿Qué incluye?' },
  { href: '#faq', label: 'FAQ' },
  { href: '#contacto', label: 'Contacto' },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full border-b transition-colors duration-300',
        scrolled
          ? 'border-white/10 bg-surface-950/85 backdrop-blur-md'
          : 'border-transparent bg-transparent',
      )}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" aria-label="AROMIA — Inicio" className="rounded-lg transition-opacity hover:opacity-80">
          <Logo size="sm" />
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <a href="#descarga">
            <Button variant="outline" size="sm" leftIcon={<Download className="h-4 w-4" />}>
              Descargar AROMIA
            </Button>
          </a>
          {user ? (
            <Button size="sm" onClick={() => navigate(LINKS.dashboard)}>
              Ir al panel <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="sm" onClick={() => navigate(LINKS.signIn)}>
              Iniciar sesión
            </Button>
          )}
        </div>

        <button
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-200 transition-colors hover:bg-white/5 lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={open}
          aria-controls="menu-movil"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {open && (
        <div
          id="menu-movil"
          className="border-t border-white/10 bg-surface-950/95 px-4 py-4 backdrop-blur-md lg:hidden"
        >
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/5"
              >
                {l.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-white/10 pt-3">
              <a
                href="#descarga"
                onClick={() => setOpen(false)}
                className="block"
              >
                <Button variant="outline" fullWidth leftIcon={<Download className="h-4 w-4" />}>
                  Descargar AROMIA
                </Button>
              </a>
              <Button
                fullWidth
                onClick={() => {
                  setOpen(false)
                  navigate(user ? LINKS.dashboard : LINKS.signIn)
                }}
              >
                {user ? 'Ir al panel' : 'Iniciar sesión'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}