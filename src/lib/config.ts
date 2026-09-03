/**
 * Configuración pública de AROMIA.
 *
 * Solo contiene datos NO sensibles (públicos por diseño). Estos valores se
 * compilan al bundle del frontend y pueden verse en el navegador.
 *
 * Los secretos (service_role, claves de firma de licencias, etc.) NUNCA deben
 * estar aquí ni en ningún archivo del frontend.
 */

export const APP_NAME = 'AROMIA'
export const APP_TAGLINE = 'Sistema de Gestión de Productos Aromáticos'

export const LINKS = {
  signIn: '/login',
  register: '/registro',
  forgot: '/recuperar',
  reset: '/restablecer',
  dashboard: '/dashboard',
  download: '/descargas',
  admin: '/admin',
} as const

/**
 * URL a la que Supabase debe redirigir tras validar el enlace de recuperación.
 * Se construye con el origen actual para adaptarse a cada entorno (dev y
 * producción) sin configuración extra. Debe estar permitida en
 * Auth → URL Configuration → Redirect URLs de Supabase.
 */
export function getResetRedirectURL(): string {
  return `${window.location.origin}${LINKS.reset}`
}

/**
 * Versión de la aplicación (solo informativo en esta fase).
 * La versión real de AROMIA Desktop se reflejará aquí cuando se defina el
 * mecanismo definitivo de distribución (fase posterior).
 */
export const APP_VERSION = '1.0.0'

/**
 * Estructura de la sección de descargas, PREPARADA para rellenar con los datos
 * de la versión oficial cuando se apruebe el mecanismo de distribución.
 *
 * En esta fase NO se publica ningún enlace definitivo (instalador): `url` está
 * vacío y la UI muestra el bloque como "próximamente".
 */
export interface AppRelease {
  version: string
  /** Fecha de publicación en formato ISO (yyyy-mm-dd). */
  publishedAt: string | null
  /** Arquitectura o arquitecturas soportadas. */
  architecture: string
  /** Tamaño aproximado del instalador. */
  size: string | null
  /** Notas de cambios/versión. */
  changelog: string[]
  /** Enlace de descarga del instalador. Vacío = aún no disponible. */
  url: string
  windows: boolean
}

export const APP_RELEASE: AppRelease = {
  windows: true,
  version: APP_VERSION,
  publishedAt: null,
  architecture: 'x64',
  size: null,
  changelog: [],
  url: '',
}

export type DownloadStatus = 'download-ready' | 'coming-soon'

export function getDownloadStatus(release: AppRelease): DownloadStatus {
  return release.url.trim() !== '' ? 'download-ready' : 'coming-soon'
}