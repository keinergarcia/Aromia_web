import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Send, ArrowLeft } from 'lucide-react'
import { AuthCard } from '@/components/auth/AuthCard'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { supabase } from '@/lib/supabase/client'
import { LINKS, getResetRedirectURL } from '@/lib/config'
import { mapAuthError } from '@/lib/auth-errors'

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error: err } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo: getResetRedirectURL() },
    )

    setLoading(false)
    if (err) {
      setError(mapAuthError(err, 'No se pudo enviar el enlace de recuperación. Inténtalo de nuevo.'))
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <AuthCard
        title="Revisa tu correo"
        subtitle="Recuperación de contraseña"
      >
        <Alert variant="success">
          Si existe una cuenta asociada a <strong>{email.trim()}</strong>,
          recibirás un enlace para restablecer tu contraseña.
        </Alert>
        <Link to={LINKS.signIn} className="mt-6 block text-center">
          <Button variant="outline" fullWidth leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Volver a iniciar sesión
          </Button>
        </Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Recuperar contraseña"
      subtitle="Te enviaremos un enlace para restablecerla"
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

        <Button
          type="submit"
          fullWidth
          size="lg"
          loading={loading}
          leftIcon={!loading ? <Send className="h-5 w-5" /> : undefined}
        >
          {loading ? 'Enviando…' : 'Enviar enlace'}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <Link to={LINKS.signIn} className="text-sm font-medium text-primary-300 hover:text-primary-200">
          <span className="inline-flex items-center gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Volver a iniciar sesión
          </span>
        </Link>
      </div>
    </AuthCard>
  )
}