import { Outlet } from 'react-router-dom'
import { AuroraBackground } from '@/components/public/AuroraBackground'
import { Logo } from '@/components/ui/Logo'

/**
 * Layout para las páginas de autenticación: fondo de marca con una tarjeta
 * centrada donde se despliega el formulario.
 */
export function AuthLayout() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-surface-950 px-4 py-10">
      <AuroraBackground />
      <div className="relative z-10 mb-8">
        <Logo />
      </div>
      <div className="relative z-10 w-full max-w-md">
        <Outlet />
      </div>
    </div>
  )
}