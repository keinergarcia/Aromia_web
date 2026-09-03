import { withSupabase } from 'npm:@supabase/server'
import { sanitize } from '../_shared/validate.ts'
import { dbIsAdmin } from '../_shared/admin.ts'

export default {
  fetch: withSupabase({ auth: 'user' }, async (req: Request, ctx) => {
    // §4.4: el dueño legítimo de la licencia o un admin pueden desactivar.
    const uid = ctx.userClaims?.id ?? null

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
    const fingerprint = sanitize(body.device_fingerprint as string)
    if (!licenseId || !fingerprint) {
      return Response.json(
        { error: { message: 'Campos requeridos', code: 'bad_request' } },
        { status: 400 },
      )
    }

    const isAdmin = uid ? await dbIsAdmin(ctx.supabaseAdmin, uid).catch(() => false) : false
    if (!uid) {
      return Response.json(
        { error: { message: 'No autenticado', code: 'unauthorized' } },
        { status: 401 },
      )
    }

    const { data: license, error: licErr } = await ctx.supabaseAdmin
      .from('licenses')
      .select('id, customer_id, activation_count')
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

    // Solo el dueño de la licencia o un admin (D3).
    if (!isAdmin && license.customer_id !== uid) {
      return Response.json(
        { error: { message: 'No autorizado', code: 'forbidden' } },
        { status: 403 },
      )
    }

    const { data: device, error: devErr } = await ctx.supabaseAdmin
      .from('devices')
      .select('id')
      .eq('fingerprint', fingerprint)
      .eq('customer_id', license.customer_id)
      .maybeSingle()
    if (devErr) {
      return Response.json(
        { error: { message: 'Error de base de datos', code: 'db_error' } },
        { status: 500 },
      )
    }
    if (!device) {
      return Response.json(
        { error: { message: 'Dispositivo no registrado', code: 'not_found' } },
        { status: 404 },
      )
    }

    const { data: activation, error: actErr } = await ctx.supabaseAdmin
      .from('license_activations')
      .select('id, status')
      .eq('license_id', license.id)
      .eq('device_id', device.id)
      .maybeSingle()
    if (actErr) {
      return Response.json(
        { error: { message: 'Error de base de datos', code: 'db_error' } },
        { status: 500 },
      )
    }
    if (!activation || activation.status !== 'active') {
      return Response.json(
        { error: { message: 'Activación no activa', code: 'not_found' } },
        { status: 404 },
      )
    }

    // Marcar inactiva y decrementar el conteo activo (server-side).
    const iso = new Date().toISOString()
    await ctx.supabaseAdmin
      .from('license_activations')
      .update({ status: 'inactive', deactivated_at: iso })
      .eq('id', activation.id)

    await ctx.supabaseAdmin
      .from('licenses')
      .update({ activation_count: Math.max(0, license.activation_count - 1) })
      .eq('id', license.id)

    return Response.json({ ok: true }, { status: 200 })
  }),
}