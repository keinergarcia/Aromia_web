import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { FullPageLoader } from '@/components/ui/FullPageLoader'
import { LINKS } from '@/lib/config'

/**
 * Protege rutas privadas: requiere sesión iniciada. Si no la hay, redirige
 * al login conservando la ruta de destino para volver tras autenticarse.
 */
export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <FullPageLoader />
  }

  if (!user) {
    return <Navigate to={LINKS.signIn} replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}

/**
 * Para páginas de autenticación (login/registro): si ya hay sesión, redirige
 * al dashboard.
 */
export function GuestRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return <FullPageLoader />
  }

  if (user) {
    return <Navigate to={LINKS.dashboard} replace />
  }

  return <Outlet />
}