import { withSupabase } from 'npm:@supabase/server'
import { dbIsAdmin } from '../_shared/admin.ts'
import { planOrNull, statusOrNull } from '../_shared/validate.ts'

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
    const action = typeof body.action === 'string' ? body.action.trim() : ''
    const plan = planOrNull(body.plan as string)
    const status = statusOrNull(body.status as string)
    const expiresAt =
      typeof body.expires_at === 'string' && body.expires_at.trim() !== ''
        ? new Date(body.expires_at).toISOString()
        : null

    if (!licenseId || !action) {
      return Response.json(
        { error: { message: 'Campos requeridos', code: 'bad_request' } },
        { status: 400 },
      )
    }

    const { data: license, error: licErr } = await ctx.supabaseAdmin
      .from('licenses')
      .select('id, customer_id, plan, status, expires_at')
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

    // Transiciones por acción (§1.3). Solo se actualiza en BD; el Desktop lo
    // aplica en la siguiente validate-license (§6.4).
    const now = new Date().toISOString()
    let update: { status?: string; expires_at?: string | null; plan?: string; updated_at?: string } | null = null

    switch (action) {
      case 'suspend':
        if (!['active', 'pending'].includes(license.status)) {
          return Response.json(
            { error: { message: 'Estado no suspende', code: 'invalid_transition' } },
            { status: 400 },
          )
        }
        update = { status: 'suspended', updated_at: now }
        break
      case 'reactivate':
        if (!['suspended'].includes(license.status)) {
          return Response.json(
            { error: { message: 'Solo se reactiva una licencia suspendida', code: 'invalid_transition' } },
            { status: 400 },
          )
        }
        if (!expiresAt && license.expires_at && new Date(license.expires_at) < new Date()) {
          return Response.json(
            { error: { message: 'Reactiva requiere expires_at vigente', code: 'invalid_transition' } },
            { status: 400 },
          )
        }
        update = { status: 'active', updated_at: now, ...(expiresAt ? { expires_at: expiresAt } : {}) }
        break
      case 'revoke':
        if (license.status === 'revoked') {
          return Response.json(
            { error: { message: 'Ya está revocada', code: 'invalid_transition' } },
            { status: 400 },
          )
        }
        update = { status: 'revoked', updated_at: now }
        break
      case 'renew':
        if (!expiresAt) {
          return Response.json(
            { error: { message: 'renew requiere expires_at', code: 'bad_request' } },
            { status: 400 },
          )
        }
        update = {
          expires_at: expiresAt,
          status: license.status === 'expired' ? 'active' : license.status,
          plan: plan ?? license.plan,
          updated_at: now,
        }
        break
      default:
        return Response.json(
          { error: { message: 'Acción desconocida', code: 'bad_request' } },
          { status: 400 },
        )
    }

    if (!update) {
      return Response.json(
        { error: { message: 'No hay cambios', code: 'no_update' } },
        { status: 400 },
      )
    }

    const { data: updated, error } = await ctx.supabaseAdmin
      .from('licenses')
      .update(update)
      .eq('id', license.id)
      .select('id, plan, status, expires_at, updated_at')
      .single()

    if (error || !updated) {
      return Response.json(
        { error: { message: error?.message ?? 'Error de base de datos', code: 'db_error' } },
        { status: 500 },
      )
    }

    return Response.json({ license: updated }, { status: 200 })
  }),
}