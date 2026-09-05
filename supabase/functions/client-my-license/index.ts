import { withSupabase } from 'npm:@supabase/server'

/**
 * AROMIA Licensing — E5: lee las licencias del cliente autenticado.
 *
 * Solo devuelve licencias cuyo customer_id coincide con el usuario de la
 * sesión (ctx.userClaims.id). Nunca expone license_key en claro.
 *
 * GET /client-my-license
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
      .from('licenses')
      .select(
        'id, customer_id, license_key, product, plan, status, max_activations, issued_at, expires_at, min_app_version, max_app_version, activated_at, last_validated_at, activation_count, created_at, updated_at, license_activations(id, status, activated_at, last_validated_at, deactivated_at, devices(id, device_name, os, fingerprint))',
      )
      .eq('customer_id', uid)
      .order('created_at', { ascending: false })

    if (error) {
      return Response.json(
        { error: { message: 'Error de base de datos', code: 'db_error', detail: error.message } },
        { status: 500 },
      )
    }

    return Response.json({ licenses: data ?? [] }, { status: 200 })
  }),
}
