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

    const url = new URL(req.url)
    const q = (url.searchParams.get('q') ?? '').trim()
    const limit = Math.min(Number(url.searchParams.get('limit') ?? 20), 50)

    if (!q) {
      return Response.json({ profiles: [] }, { status: 200 })
    }

    const { data, error } = await ctx.supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, account_status')
      .or(`email.ilike.%${q}%,full_name.ilike.%${q}%`)
      .order('email', { ascending: true })
      .limit(limit)

    if (error) {
      return Response.json(
        { error: { message: 'Error de base de datos', code: 'db_error', detail: error.message } },
        { status: 500 },
      )
    }

    return Response.json({ profiles: data ?? [] }, { status: 200 })
  }),
}