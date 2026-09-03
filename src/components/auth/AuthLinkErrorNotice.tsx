import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MailX } from 'lucide-react'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { LINKS } from '@/lib/config'

interface HashError {
  code: string
  description: string
}

/**
 * Supabase redirige a la app con los errores de los enlaces de email en el
 * hash de la URL, p. ej.:
 *   #error=access_denied&error_code=otp_expired&error_description=...
 * Con detectSessionInUrl activo, supabase-js consume los tokens válidos,
 * pero cuando el enlace caducó o ya se usó el error queda en la URL y la
 * app no lo mostraba. Este componente lo detecta y guía al usuario a pedir
 * un enlace nuevo.
 */
export function AuthLinkErrorNotice() {
  const [hash, setHash] = useState(() => window.location.hash)

  useEffect(() => {
    const handleHash = () => setHash(window.location.hash)
    window.addEventListener('hashchange', handleHash)
    return () => window.removeEventListener('hashchange', handleHash)
  }, [])

  // Solo reaccionar a los errores de token/enlace de email. Los #access_token
  // válidos los procesa supabase-js antes incluso de que lleguemos aquí.
  const error = useMemo<HashError | null>(() => {
    if (hash.length <= 1) return null
    const params = new URLSearchParams(hash.slice(1))
    const code = params.get('error_code')
    const description = params.get('error_description')
    if (code === 'otp_expired' || code === 'access_denied') {
      return { code, description: decodeURIComponent(description ?? '') }
    }
    return null
  }, [hash])

  if (!error) return null

  return (
    <div className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6">
      <Alert variant="error" className="mx-auto max-w-md shadow-lg shadow-black/40">
        <div className="flex flex-col gap-3">
          <p className="flex items-start gap-2 font-medium">
            <MailX className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
            {error.description || 'El enlace de confirmación no es válido o ya expiró.'}
          </p>
          <p className="text-slate-300">
            Los enlaces de confirmación son de un solo uso y caducan. Regístrate
            de nuevo con el mismo correo para que te enviemos uno nuevo.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link to={LINKS.register} className="inline-flex">
              <Button size="sm" variant="primary">
                Enviar enlace nuevo
              </Button>
            </Link>
            <Link
              to={LINKS.signIn}
              className="inline-flex items-center text-sm font-semibold text-primary-300 hover:text-primary-200"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      </Alert>
    </div>
  )
}