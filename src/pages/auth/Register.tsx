import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, RefreshCw, User, UserPlus } from 'lucide-react'
import { AuthCard } from '@/components/auth/AuthCard'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { supabase } from '@/lib/supabase/client'
import { LINKS } from '@/lib/config'
import { mapAuthError } from '@/lib/auth-errors'

function requiredPassword(value: string): string | null {
  if (!value) return 'La contraseña es obligatoria'
  if (value.length < 8) return 'La contraseña debe tener al menos 8 caracteres'
  return null
}

export function Register() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needsConfirmation, setNeedsConfirmation] = useState(false)
  const [resent, setResent] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    const pwdError = requiredPassword(password)
    if (pwdError) {
      setError(pwdError)
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim() || null },
        // Devuelve el enlace de confirmación a la app para que supabase-js
        // procese el token (detectSessionInUrl). Debe estar permitido en
        // Auth → URL Configuration → Redirect URLs de Supabase.
        emailRedirectTo: `${window.location.origin}${LINKS.dashboard}`,
      },
    })

    setLoading(false)

    if (err) {
      setError(mapAuthError(err))
      return
    }

    if (data.session) {
      // Confirmación de email desactivada: sesión iniciada de inmediato.
      navigate(LINKS.dashboard, { replace: true })
    } else {
      setNeedsConfirmation(true)
    }
  }

  const handleResend = async () => {
    setError(null)
    setLoading(true)

    const { error: err } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}${LINKS.dashboard}` },
    })

    setLoading(false)

    if (err) {
      setError(
        mapAuthError(
          err,
          'No se pudo reenviar el correo. Verifica que no hayas superado el límite de envíos e inténtalo de nuevo.',
        ),
      )
      return
    }
    setResent(true)
  }

  if (needsConfirmation) {
    return (
      <AuthCard
        title="Revisa tu correo"
        subtitle="Hemos enviado un enlace para confirmar tu cuenta"
      >
        <div className="space-y-4">
          {error ? (
            <Alert variant="error">{error}</Alert>
          ) : resent ? (
            <Alert variant="success">
              Enviamos un enlace nuevo a <strong>{email.trim()}</strong>. Ten en
              cuenta que el enlace anterior dejó de ser válido.
            </Alert>
          ) : (
            <Alert variant="success">
              Te enviamos un correo a <strong>{email.trim()}</strong>. Confirma tu
              cuenta con el enlace que recibiste y luego inicia sesión.
            </Alert>
          )}

          <p className="text-sm text-slate-400">
            ¿No llegó o el enlace ya no funciona? Cada correo solo sirve una vez y
            caduca a las horas de enviado.
          </p>

          <Button
            type="button"
            variant="outline"
            fullWidth
            loading={loading}
            leftIcon={!loading ? <RefreshCw className="h-4 w-4" /> : undefined}
            onClick={handleResend}
          >
            {loading ? 'Enviando…' : 'Reenviar correo de confirmación'}
          </Button>
        </div>

        <div className="mt-6 text-center">
          <Link to={LINKS.signIn} className="text-sm font-semibold text-primary-300 hover:text-primary-200">
            Ir a iniciar sesión
          </Link>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Crear tu cuenta"
      subtitle="Comienza a usar tu panel de AROMIA"
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && <Alert variant="error">{error}</Alert>}

        <Input
          label="Nombre"
          autoComplete="name"
          placeholder="Tu nombre"
          icon={<User className="h-4 w-4" />}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />

        <Input
          label="Correo electrónico"
          type="email"
          required
          autoComplete="email"
          placeholder="tu@correo.com"
          icon={<Mail className="h-4 w-4" />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <PasswordInput
          label="Contraseña"
          required
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          hint="Usa al menos 8 caracteres."
          id="register-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <PasswordInput
          label="Confirmar contraseña"
          required
          autoComplete="new-password"
          placeholder="Repite tu contraseña"
          id="register-confirm"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />

        <Button
          type="submit"
          fullWidth
          size="lg"
          loading={loading}
          leftIcon={!loading ? <UserPlus className="h-5 w-5" /> : undefined}
        >
          {loading ? 'Creando cuenta…' : 'Crear cuenta'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        ¿Ya tienes cuenta?{' '}
        <Link to={LINKS.signIn} className="font-semibold text-primary-300 hover:text-primary-200">
          Inicia sesión
        </Link>
      </p>
    </AuthCard>
  )
}