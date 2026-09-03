import { withSupabase } from 'npm:@supabase/server'
import { dbIsAdmin } from '../_shared/admin.ts'

export default {
  fetch: withSupabase({ auth: 'user' }, async (req: Request, ctx) => {
    const uid = ctx.userClaims?.id ?? null
    if (!uid || !(await dbIsAdmin(ctx.supabaseAdmin, uid).catch(() => false))) {
      return Response.json(
        { error: { message: 'No autorizado', code: 'forbidden' } },
        { status: 403 },
      )
    }

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return Response.json(
        { error: { message: 'JSON inválido', code: 'bad_request' } },
        { status: 400 },
      )
    }

    const licenseId = typeof body.license_id === 'string' ? body.license_id.trim() : ''
    const deviceId = typeof body.device_id === 'string' ? body.device_id.trim() : ''
    if (!licenseId || !deviceId) {
      return Response.json(
        { error: { message: 'Campos requeridos', code: 'bad_request' } },
        { status: 400 },
      )
    }

    const { data: activation, error: actErr } = await ctx.supabaseAdmin
      .from('license_activations')
      .select('id, status, license_id')
      .eq('license_id', licenseId)
      .eq('device_id', deviceId)
      .eq('status', 'active')
      .maybeSingle()

    if (actErr) {
      return Response.json(
        { error: { message: 'Error de base de datos', code: 'db_error' } },
        { status: 500 },
      )
    }
    if (!activation) {
      return Response.json(
        { error: { message: 'Activación activa no encontrada', code: 'not_found' } },
        { status: 404 },
      )
    }

    const iso = new Date().toISOString()
    const { error } = await ctx.supabaseAdmin
      .from('license_activations')
      .update({ status: 'inactive', deactivated_at: iso })
      .eq('id', activation.id)
    if (error) {
      return Response.json(
        { error: { message: 'Error de base de datos', code: 'db_error' } },
        { status: 500 },
      )
    }

    // Decrementar el conteo activo (server-side), sin bajar de 0.
    const { data: license } = await ctx.supabaseAdmin
      .from('licenses')
      .select('activation_count')
      .eq('id', activation.license_id)
      .single()

    await ctx.supabaseAdmin
      .from('licenses')
      .update({ activation_count: Math.max(0, (license?.activation_count ?? 1) - 1) })
      .eq('id', activation.license_id)

    return Response.json({ ok: true }, { status: 200 })
  }),
}