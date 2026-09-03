interface AuthErrorLike {
  message?: string
  code?: string
  status?: number
}

interface ErrorRule {
  test: RegExp
  message: string
}

const RULES: ErrorRule[] = [
  {
    test: /email rate limit|rate limit exceeded|over_email_send_rate_limit/i,
    message:
      'Has superado el límite de envíos de correo de esta hora. Espera unos minutos y vuelve a intentarlo.',
  },
  {
    test: /already registered|user_already_exists|already a user/i,
    message:
      'Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña.',
  },
  {
    test: /invalid login credentials|invalid_credentials|invalid email or password/i,
    message:
      'El correo o la contraseña son incorrectos, o la cuenta aún no está confirmada.',
  },
  {
    test: /email not confirmed|not confirmed|confirmation.*email|verify your email/i,
    message:
      'Tu cuenta aún no está confirmada. Revisa tu correo y confírmala con el enlace que recibiste.',
  },
  {
    test: /password.*at least|at least 8|weak password|new password should be longer/i,
    message: 'La contraseña debe tener al menos 8 caracteres.',
  },
  {
    test: /invalid email|email address.*invalid|malformed.*email|unable to validate email address/i,
    message: 'El correo no tiene un formato válido.',
  },
  {
    test: /token.*invalid|token.*expir|otp.*expir|link.*invalid|recovery.*invalid/i,
    message: 'El enlace no es válido o ya expiró. Solicita uno nuevo.',
  },
  {
    test: /failed to fetch|fetch failed|network error|network request failed|getaddrinfo|enotfound|econnaborted/i,
    message:
      'No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.',
  },
  {
    test: /security purposes|for security|attempts exceed|captcha|recaptcha/i,
    message:
      'Demasiados intentos seguidos. Espera unos minutos y vuelve a intentarlo.',
  },
]

export function mapAuthError(
  err: AuthErrorLike | null | undefined,
  fallback = 'No se pudo completar la acción. Inténtalo de nuevo.',
): string {
  const source = `${err?.message ?? ''} ${err?.code ?? ''}`

  for (const rule of RULES) {
    if (rule.test.test(source)) return rule.message
  }

  if (err?.status && err.status >= 500) {
    return 'El servidor está fallando en este momento. Inténtalo en unos minutos.'
  }

  return fallback
}