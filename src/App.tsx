import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute, GuestRoute } from '@/components/auth/ProtectedRoute'
import { AdminRoute } from '@/components/auth/AdminRoute'
import { AuthLinkErrorNotice } from '@/components/auth/AuthLinkErrorNotice'
import { PublicLayout } from '@/layouts/PublicLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { AdminLayout } from '@/layouts/AdminLayout'
import { Home } from '@/pages/public/Home'
import { Login } from '@/pages/auth/Login'
import { Register } from '@/pages/auth/Register'
import { ForgotPassword } from '@/pages/auth/ForgotPassword'
import { ResetPassword } from '@/pages/auth/ResetPassword'
import { DashboardIndex } from '@/pages/dashboard/DashboardIndex'
import { MyAccount } from '@/pages/dashboard/MyAccount'
import { Downloads } from '@/pages/dashboard/Downloads'
import { MyLicense } from '@/pages/dashboard/MyLicense'
import { MyDevices } from '@/pages/dashboard/MyDevices'
import { AdminIndex } from '@/pages/admin/AdminIndex'
import { NotFound } from '@/pages/NotFound'
import { LINKS } from '@/lib/config'

export default function App() {
  return (
    <AuthProvider>
      <AuthLinkErrorNotice />
      <Routes>
        {/* Página pública: landing (index) y 404 */}
        <Route element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Autenticación: solo sin sesión */}
        <Route element={<GuestRoute />}>
          <Route element={<AuthLayout />}>
            <Route path={LINKS.signIn} element={<Login />} />
            <Route path={LINKS.register} element={<Register />} />
            <Route path={LINKS.forgot} element={<ForgotPassword />} />
          </Route>
        </Route>

        {/* Restablecer contraseña: accesible con la sesión de recuperación */}
        <Route element={<AuthLayout />}>
          <Route path={LINKS.reset} element={<ResetPassword />} />
        </Route>

        {/* Panel privado: requiere sesión */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardIndex />} />
            <Route path="/dashboard/mi-cuenta" element={<MyAccount />} />
            <Route path="/dashboard/descargas" element={<Downloads />} />
            <Route path="/dashboard/mi-licencia" element={<MyLicense />} />
            <Route path="/dashboard/mis-dispositivos" element={<MyDevices />} />
          </Route>
        </Route>

        {/* Panel de administración: requiere sesión + rol admin (verificado en BD) */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AdminRoute />}>
            <Route element={<AdminLayout />}>
              <Route path={LINKS.admin} element={<AdminIndex />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  )
}