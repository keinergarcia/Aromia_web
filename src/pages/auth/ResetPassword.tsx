import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound } from 'lucide-react'
import { AuthCard } from '@/components/auth/AuthCard'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { supabase } from '@/lib/supabase/client'
import { LINKS } from '@/lib/config'
import { mapAuthError } from '@/lib/auth-errors'

export function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [checking, setChecking] = useState(true)

  // Con detectSessionInUrl activado, supabase-js procesa el token de
  // recuperación de la URL y establece la sesión automáticamente.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setReady(true)
      } else {
        setError(
          'El enlace no es válido o ya expiró. Solicita uno nuevo para restablecer tu contraseña.',
        )
      }
      setChecking(false)
    })
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })

    setLoading(false)
    if (err) {
      setError(mapAuthError(err, 'No se pudo actualizar la contraseña. Inténtalo de nuevo.'))
      return
    }

    navigate(LINKS.dashboard, { replace: true })
  }

  return (
    <AuthCard title="Nueva contraseña" subtitle="Define una nueva contraseña para tu cuenta">
      {checking ? (
        <div className="flex flex-col items-center gap-3 py-8 text-slate-400">
          <Spinner />
          <p className="text-sm">Verificando el enlace…</p>
        </div>
      ) : error && !ready ? (
        <>
          <Alert variant="error">{error}</Alert>
        </>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && <Alert variant="error">{error}</Alert>}

          <PasswordInput
            label="Nueva contraseña"
            required
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            hint="Usa al menos 8 caracteres."
            id="reset-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <PasswordInput
            label="Confirmar contraseña"
            required
            autoComplete="new-password"
            placeholder="Repite tu contraseña"
            id="reset-confirm"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />

          <Button
            type="submit"
            fullWidth
            size="lg"
            loading={loading}
            leftIcon={!loading ? <KeyRound className="h-5 w-5" /> : undefined}
          >
            {loading ? 'Guardando…' : 'Guardar contraseña'}
          </Button>
        </form>
      )}
    </AuthCard>
  )
}