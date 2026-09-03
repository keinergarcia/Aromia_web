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

    let query = ctx.supabaseAdmin
      .from('licenses')
      .select('id, customer_id, product, plan, status, max_activations, issued_at, expires_at, min_app_version, max_app_version, activated_at, last_validated_at, activation_count, created_at, updated_at, profiles(id, email, full_name), license_activations(id, status, activated_at, last_validated_at, devices(id, device_name, os, fingerprint))')

    const url = new URL(req.url)
    const status = url.searchParams.get('status')
    const q = url.searchParams.get('q')
    const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 100)
    const offset = Number(url.searchParams.get('offset') ?? 0)

    if (status) query = query.eq('status', status)
    if (q) query = query.ilike('profiles.email', `%${q}%`)

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return Response.json(
        { error: { message: 'Error de base de datos', code: 'db_error', detail: error.message } },
        { status: 500 },
      )
    }

    return Response.json({ licenses: data ?? [] }, { status: 200 })
  }),
}