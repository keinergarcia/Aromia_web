import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Mail, User, Calendar, ShieldCheck, Save } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase/client'

const isActive = (status: string) => status === 'active'

export function MyAccount() {
  const { user, profile, refreshProfile } = useAuth()
  const [fullName, setFullName] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setFullName(profile?.full_name ?? '')
    setLoading(false)
  }, [profile])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setError(null)
    setSaving(true)

    const { error: err } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim() || null })
      .eq('id', user?.id ?? '')

    setSaving(false)

    if (err) {
      setError('No se pudo guardar el perfil. Inténtalo de nuevo.')
      return
    }

    await refreshProfile()
    setMessage('Tu perfil se actualizó correctamente.')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner />
      </div>
    )
  }

  const active = isActive(profile?.account_status ?? 'active')

  return (
    <div>
      <PageHeader
        title="Mi cuenta"
        description="Consulta y edita la información de tu cuenta"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Información de perfil */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {message && <Alert variant="success">{message}</Alert>}
              {error && <Alert variant="error">{error}</Alert>}

              <Input
                label="Nombre"
                icon={<User className="h-4 w-4" />}
                placeholder="Tu nombre"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />

              <Input
                label="Correo electrónico"
                type="email"
                icon={<Mail className="h-4 w-4" />}
                value={user?.email ?? ''}
                disabled
                hint="El correo no se puede cambiar desde el panel."
              />
            </CardContent>
            <CardFooter className="justify-end gap-3 pt-0">
              <Button type="submit" loading={saving} leftIcon={!saving ? <Save className="h-4 w-4" /> : undefined}>
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Detalles de la cuenta */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Detalles de cuenta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-400">
                <ShieldCheck className="h-4 w-4" /> Estado
              </span>
              <Badge variant={active ? 'success' : 'default'}>
                {active ? 'Activa' : 'Pendiente'}
              </Badge>
            </div>
            {user?.created_at && (
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-slate-400">
                  <Calendar className="h-4 w-4" /> Miembro desde
                </span>
                <span className="text-right text-slate-300">
                  {new Date(user.created_at).toLocaleDateString('es-ES')}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}