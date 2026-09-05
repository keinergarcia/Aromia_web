import { withSupabase } from 'npm:@supabase/server'
import { dbIsAdmin } from '../_shared/admin.ts'

/**
 * AROMIA Licensing — E7: reactiva un dispositivo previamente desactivado.
 *
 * Solo admin (D3). Busca la activación inactiva de la licencia+dispositivo y
 * la vuelve a marcar como activa, siempre que la licencia esté activa y aún
 * tenga slots libres (activation_count < max_activations).
 *
 * POST /admin-reactivate-device
 * Auth: 'user' (admin verificado en BD).
 */
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

    // La licencia debe existir y estar activa (no suspendida/revocada/expirada).
    const { data: license, error: licErr } = await ctx.supabaseAdmin
      .from('licenses')
      .select('id, status, activation_count, max_activations, expires_at')
      .eq('id', licenseId)
      .maybeSingle()
    if (licErr) {
      return Response.json(
        { error: { message: 'Error de base de datos', code: 'db_error' } },
        { status: 500 },
      )
    }
    if (!license) {
      return Response.json(
        { error: { message: 'Licencia no encontrada', code: 'not_found' } },
        { status: 404 },
      )
    }
    if (license.status !== 'active') {
      return Response.json(
        { error: { message: 'La licencia no está activa', code: 'license_state' } },
        { status: 400 },
      )
    }
    if (license.expires_at && new Date(license.expires_at) <= new Date()) {
      return Response.json(
        { error: { message: 'La licencia está expirada', code: 'expired' } },
        { status: 410 },
      )
    }

    // Buscar la activación inactiva de esta licencia+dispositivo.
    const { data: activation, error: actErr } = await ctx.supabaseAdmin
      .from('license_activations')
      .select('id, status, license_id')
      .eq('license_id', licenseId)
      .eq('device_id', deviceId)
      .eq('status', 'inactive')
      .maybeSingle()
    if (actErr) {
      return Response.json(
        { error: { message: 'Error de base de datos', code: 'db_error' } },
        { status: 500 },
      )
    }
    if (!activation) {
      return Response.json(
        { error: { message: 'No hay un dispositivo desactivado para reactivar', code: 'not_found' } },
        { status: 404 },
      )
    }

    // Comprobar por separado activas actuales (fuente de verdad) contra el tope.
    const { count, error: countErr } = await ctx.supabaseAdmin
      .from('license_activations')
      .select('id', { count: 'exact', head: true })
      .eq('license_id', licenseId)
      .eq('status', 'active')
    if (countErr) {
      return Response.json(
        { error: { message: 'Error de base de datos', code: 'db_error' } },
        { status: 500 },
      )
    }
    if ((count ?? 0) >= license.max_activations) {
      return Response.json(
        { error: { message: 'Máximo de activaciones alcanzado', code: 'max_activations' } },
        { status: 400 },
      )
    }

    const iso = new Date().toISOString()
    const { error: updErr } = await ctx.supabaseAdmin
      .from('license_activations')
      .update({
        status: 'active',
        activated_at: iso,
        last_validated_at: iso,
        deactivated_at: null,
      })
      .eq('id', activation.id)
    if (updErr) {
      return Response.json(
        { error: { message: 'Error de base de datos', code: 'db_error' } },
        { status: 500 },
      )
    }

    // Recalcular activation_count real (evita drift/race) tras reactivar.
    const { count: newCount } = await ctx.supabaseAdmin
      .from('license_activations')
      .select('id', { count: 'exact', head: true })
      .eq('license_id', licenseId)
      .eq('status', 'active')

    await ctx.supabaseAdmin
      .from('licenses')
      .update({
        activation_count: newCount ?? 0,
        last_validated_at: iso,
        updated_at: iso,
      })
      .eq('id', licenseId)

    return Response.json({ ok: true }, { status: 200 })
  }),
}
