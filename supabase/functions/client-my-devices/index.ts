import { withSupabase } from 'npm:@supabase/server'

/**
 * AROMIA Licensing — E5: lee los dispositivos del cliente autenticado junto
 * con las licencias y activaciones a las que están vinculados.
 *
 * Solo devuelve dispositivos cuyo customer_id coincide con el usuario de la
 * sesión (ctx.userClaims.id). No expone license_key en claro.
 *
 * GET /client-my-devices
 * Auth: 'user' (requiere sesión web).
 */
export default {
  fetch: withSupabase({ auth: 'user' }, async (req: Request, ctx) => {
    const uid = ctx.userClaims?.id ?? null
    if (!uid) {
      return Response.json(
        { error: { message: 'No autenticado', code: 'unauthorized' } },
        { status: 401 },
      )
    }

    const { data, error } = await ctx.supabaseAdmin
      .from('devices')
      .select(
        'id, customer_id, fingerprint, device_name, os, created_at, updated_at, license_activations(id, status, activated_at, last_validated_at, deactivated_at, licenses(id, product, plan, status, expires_at))',
      )
      .eq('customer_id', uid)
      .order('created_at', { ascending: false })

    if (error) {
      return Response.json(
        { error: { message: 'Error de base de datos', code: 'db_error', detail: error.message } },
        { status: 500 },
      )
    }

    return Response.json({ devices: data ?? [] }, { status: 200 })
  }),
}
