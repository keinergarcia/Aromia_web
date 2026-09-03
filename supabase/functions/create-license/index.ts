import { withSupabase } from 'npm:@supabase/server'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { generateLicenseKey, sha256Hex } from '../_shared/keys.ts'
import { dbIsAdmin } from '../_shared/admin.ts'
import { productAndPlan, isPlan, sanitize, statusOrNull, semverCompare } from '../_shared/validate.ts'

export default {
  fetch: withSupabase({ auth: 'user' }, async (req: Request, ctx) => {
    // Solo admin puede crear licencias (verificación en BD, D3).
    const uid = ctx.userClaims?.id ?? null
    if (!uid || !(await dbIsAdmin(ctx.supabaseAdmin, uid))) {
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

    const customerId = typeof body.customer_id === 'string' ? body.customer_id.trim() : ''
    const plan = typeof body.plan === 'string' ? body.plan.toLowerCase() : ''
    const maxActivations = Number(body.max_activations ?? 1)
    const expiresAt =
      typeof body.expires_at === 'string' && body.expires_at.trim() !== ''
        ? new Date(body.expires_at).toISOString()
        : null
    const status = statusOrNull(body.status as string) ?? 'active'
    const minAppVersion =
      typeof body.min_app_version === 'string' && body.min_app_version.trim() !== ''
        ? sanitize(body.min_app_version)
        : null
    const maxAppVersion =
      typeof body.max_app_version === 'string' && body.max_app_version.trim() !== ''
        ? sanitize(body.max_app_version)
        : null

    if (!customerId || !isPlan(plan) || !Number.isInteger(maxActivations) || maxActivations < 1) {
      return Response.json(
        { error: { message: 'Datos inválidos', code: 'bad_request' } },
        { status: 400 },
      )
    }
    // Solo se pueden crear licencias en los estados iniciales permitidos (§1.3).
    if (status !== 'active' && status !== 'pending') {
      return Response.json(
        { error: { message: 'Estado inicial inválido', code: 'bad_request' } },
        { status: 400 },
      )
    }
    if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
      return Response.json(
        { error: { message: 'expires_at debe ser futuro', code: 'bad_request' } },
        { status: 400 },
      )
    }
    if (
      minAppVersion &&
      maxAppVersion &&
      semverCompare(minAppVersion, maxAppVersion) > 0
    ) {
      return Response.json(
        { error: { message: 'Rango de versión inválido', code: 'bad_request' } },
        { status: 400 },
      )
    }

    // El cliente destinatario debe existir en profiles.
    const { data: profile, error: profileErr } = await ctx.supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', customerId)
      .maybeSingle()
    if (profileErr) {
      return Response.json(
        { error: { message: 'Error de base de datos', code: 'db_error' } },
        { status: 500 },
      )
    }
    if (!profile) {
      return Response.json(
        { error: { message: 'Cliente no existe', code: 'not_found' } },
        { status: 404 },
      )
    }

    const licenseKey = generateLicenseKey()
    const licenseKeyHash = await sha256Hex(licenseKey)

    const { data: license, error } = await ctx.supabaseAdmin
      .from('licenses')
      .insert({
        customer_id: customerId,
        // El license_key_clear sigue en la columna license_key por el esquema
        // actual (NOT NULL unique); el hash es la clave de búsqueda funcional.
        // Nunca se expone en respuestas posteriores (solo al crear).
        license_key: licenseKey,
        license_key_hash: licenseKeyHash,
        plan,
        product: productAndPlan(plan) as string,
        max_activations: maxActivations,
        expires_at: expiresAt,
        min_app_version: minAppVersion,
        max_app_version: maxAppVersion,
        status,
      })
      .select('id, customer_id, plan, status, max_activations, product, expires_at, issued_at, created_at')
      .single()

    if (error || !license) {
      return Response.json(
        { error: { message: error?.message ?? 'No se pudo crear', code: 'db_error' } },
        { status: 500 },
      )
    }

    // La clave en claro solo se entrega AHORA (para entregarla al cliente) (§4.1).
    return Response.json(
      {
        license_key: licenseKey,
        license: {
          id: license.id,
          customer_id: license.customer_id,
          product: license.product,
          plan: license.plan,
          status: license.status,
          max_activations: license.max_activations,
          expires_at: license.expires_at,
          issued_at: license.issued_at,
          created_at: license.created_at,
        },
      },
      { status: 201 },
    )
  }),
}