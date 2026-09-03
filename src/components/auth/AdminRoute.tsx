import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { FullPageLoader } from '@/components/ui/FullPageLoader'
import { LINKS } from '@/lib/config'
import { isAdmin } from '@/lib/admin'

/**
 * Protege las rutas del panel de administración: requiere sesión iniciada Y
 * rol admin verificado en BD (is_admin). Si no hay sesión o no es admin,
 * redirige sin revelar contenido.
 */
export function AdminRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()
  const [admin, setAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    let active = true
    if (!user) {
      setAdmin(false)
      return
    }
    isAdmin()
      .then((ok) => {
        if (active) setAdmin(ok)
      })
      .catch(() => {
        if (active) setAdmin(false)
      })
    return () => {
      active = false
    }
  }, [user])

  if (loading) {
    return <FullPageLoader />
  }

  if (!user) {
    return <Navigate to={LINKS.signIn} replace state={{ from: location.pathname }} />
  }

  if (admin === null) {
    return <FullPageLoader />
  }

  if (!admin) {
    // Sin rol admin: vuelve al dashboard de cliente, no revela la ruta.
    return <Navigate to={LINKS.dashboard} replace />
  }

  return <Outlet />
}