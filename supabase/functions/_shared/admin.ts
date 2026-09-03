/**
 * AROMIA Licensing — verificación de rol admin (D3).
 *
 * Fuente de verdad: tabla public.admin_users (migración 0005). El hook de JWT
 * puede inyectar app_metadata.role='admin' para rendimiento, pero en
 * operaciones sensibles SIEMPRE se vuelve a verificar en BD (supabaseAdmin),
 * nunca confiar solo en el claim.
 */

export interface DbLike {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, value: string) => Promise<{ data: unknown; error: unknown }>
    }
  }
}

/** Verifica en BD que `userId` pertenece a admin_users. */
export async function dbIsAdmin(db: DbLike, userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false
  const { data, error } = await db
    .from('admin_users')
    .select('id')
    .eq('id', userId)
  if (error) throw error
  return Array.isArray(data) && data.length > 0
}