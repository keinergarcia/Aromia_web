import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Mail, LogIn } from 'lucide-react'
import { AuthCard } from '@/components/auth/AuthCard'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { supabase } from '@/lib/supabase/client'
import { LINKS } from '@/lib/config'
import { mapAuthError } from '@/lib/auth-errors'

export function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    setLoading(false)
    if (err) {
      setError(
        mapAuthError(
          err,
          'No se pudo iniciar sesión. Revisa tu correo y contraseña, o confirma tu cuenta.',
        ),
      )
      return
    }

    navigate(from && from !== '/login' ? from : LINKS.dashboard, { replace: true })
  }

  return (
    <AuthCard
      title="Iniciar sesión"
      subtitle="Accede a tu panel de AROMIA"
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && <Alert variant="error">{error}</Alert>}

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
          autoComplete="current-password"
          placeholder="••••••••"
          id="login-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="flex justify-end">
          <Link
            to={LINKS.forgot}
            className="text-sm font-medium text-primary-300 hover:text-primary-200"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <Button
          type="submit"
          fullWidth
          size="lg"
          loading={loading}
          leftIcon={!loading ? <LogIn className="h-5 w-5" /> : undefined}
        >
          {loading ? 'Ingresando…' : 'Iniciar sesión'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        ¿No tienes cuenta?{' '}
        <Link to={LINKS.register} className="font-semibold text-primary-300 hover:text-primary-200">
          Regístrate
        </Link>
      </p>
    </AuthCard>
  )
}