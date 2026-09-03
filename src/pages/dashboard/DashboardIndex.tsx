import { useNavigate } from 'react-router-dom'
import { ShieldCheck, User, Mail, Calendar, KeyRound, Download, ArrowRight, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { useAuth } from '@/contexts/AuthContext'
import { LINKS, APP_NAME } from '@/lib/config'

const isActive = (status: string) => status === 'active'

export function DashboardIndex() {
  const { user, profile, profileError } = useAuth()
  const navigate = useNavigate()
  const active = isActive(profile?.account_status ?? 'active')

  return (
    <div className="space-y-6">
      {profileError && (
        <Alert variant="warning">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            No se pudo cargar tu perfil. Esto puede deberse a un problema de
            conexión o de configuración de la base de datos; reintenta en unos
            momentos y verifica la configuración de Supabase si persiste.
          </span>
        </Alert>
      )}

      <div>
        <h1 className="text-2xl font-bold text-white">
          Hola, {profile?.full_name || 'bienvenido'}
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Este es tu panel de {APP_NAME}. Podrás gestionar tu cuenta, tus
          licencias y tus descargas desde aquí.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Estado de cuenta */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Estado de cuenta</CardTitle>
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant={active ? 'success' : 'default'}>
                {active ? 'Activa' : 'Pendiente de confirmar'}
              </Badge>
            </div>
            <p className="mt-4 text-sm text-slate-400">
              {active
                ? 'Tu cuenta está lista para usarse.'
                : 'Confirma tu correo para activar tu cuenta.'}
            </p>
          </CardContent>
        </Card>

        {/* Usuario */}
        <Card>
          <CardHeader>
            <CardTitle>Tu cuenta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 shrink-0 text-slate-500" />
              <span className="truncate text-slate-300">
                {profile?.full_name || 'Sin nombre'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 shrink-0 text-slate-500" />
              <span className="truncate text-slate-300">{user?.email}</span>
            </div>
            {profile?.created_at && (
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 shrink-0 text-slate-500" />
                <span className="text-slate-300">
                  Miembro desde {new Date(profile.created_at).toLocaleDateString('es-ES')}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Acceso rápido */}
        <Card>
          <CardHeader>
            <CardTitle>Acceso rápido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              fullWidth
              variant="secondary"
              leftIcon={<Download className="h-4 w-4" />}
              onClick={() => navigate(LINKS.download)}
            >
              Ir a descargas
            </Button>
            <Button
              fullWidth
              variant="outline"
              leftIcon={<KeyRound className="h-4 w-4" />}
              onClick={() => navigate('/dashboard/mi-licencia')}
            >
              Ver mi licencia <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}