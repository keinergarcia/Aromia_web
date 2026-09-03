import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../types/supabase'

/**
 * Cliente público de Supabase para el navegador.
 *
 * Utiliza SOLO la anon/publishable key (pública por diseño). La seguridad real
 * la proporciona Row Level Security (RLS): cada usuario solo puede acceder a
 * sus propios datos.
 *
 * La service_role / secret key jamás se usa aquí: esa clave se reserva para
 * operaciones de servidor (Edge Functions) en fases posteriores.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined

if (!supabaseUrl || !supabaseAnonKey) {
  if (import.meta.env.DEV) {
    throw new Error(
      'Faltan las variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. Copia .env.example como .env y rellena los valores.',
    )
  }
}

export const supabase = createClient<Database>(
  supabaseUrl ?? '',
  supabaseAnonKey ?? '',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
)