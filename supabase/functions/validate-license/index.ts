import { withSupabase } from 'npm:@supabase/server'
import { buildPayload, buildSignedLicense } from '../_shared/payload.ts'
import { getKeyId } from '../_shared/crypto.ts'
import { appVersion, sanitize, versionInRange } from '../_shared/validate.ts'
import { GRACE_HOURS } from '../_shared/constants.ts'

export default {
  fetch: withSupabase({ auth: 'none' }, async (req: Request, ctx) => {
    // Validación periódica silenciosa del Desktop (§4.3).
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
    const version = appVersion(body.app_version as string)

    if (!licenseId || !fingerprint || !version) {
      return Response.json(
        { error: { message: 'Campos requeridos', code: 'bad_request' } },
        { status: 400 },
      )
    }

    const { data: license, error: licErr } = await ctx.supabaseAdmin
      .from('licenses')
      .select('id, customer_id, plan, status, max_activations, expires_at, issued_at, product, min_app_version, max_app_version')
      .eq('id', licenseId)
      .maybeSingle()

    if (licErr) {
      return Response.json(
        { error: { message: 'Error de base de datos', code: 'db_error' } },
        { status: 500 },
      )
    }
    if (!license) {
      // 404 → el Desktop se desactiva (§7).
      return Response.json(
        { error: { message: 'Licencia no encontrada', code: 'not_found' } },
        { status: 404 },
      )
    }

    // Cualquier estado distinto de active → 403 → desactiva (§1.3, §7).
    if (license.status !== 'active') {
      return Response.json(
        {
          error: {
            message: 'Licencia no activa',
            code: license.status === 'suspended' ? 'suspended' : license.status,
          },
        },
        { status: 403 },
      )
    }

    const now = Date.now()
    if (license.expires_at && new Date(license.expires_at).getTime() <= now) {
      return Response.json(
        { error: { message: 'Licencia expirada', code: 'expired' } },
        { status: 403 },
      )
    }

    if (!versionInRange(version ?? '', license.min_app_version, license.max_app_version)) {
      return Response.json(
        { error: { message: 'Versión no compatible', code: 'version_not_supported' } },
        { status: 403 },
      )
    }

    // El fingerprint debe estar activo en esta licencia para validar.
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

    // Todo OK: refresca last_validated_at de licencia y activación.
    const iso = new Date(now).toISOString()
    await ctx.supabaseAdmin
      .from('licenses')
      .update({ last_validated_at: iso })
      .eq('id', license.id)
    await ctx.supabaseAdmin
      .from('license_activations')
      .update({ last_validated_at: iso })
      .eq('id', activation.id)

    // Re-firma el payload con los valores vigentes (refresca por si cambió
    // plan/expiración/status) (§4.3).
    const payload = buildPayload({
      licenseId: license.id,
      keyId: getKeyId(),
      customer: null,
      plan: license.plan,
      status: license.status,
      maxActivations: license.max_activations,
      expiresAt: license.expires_at,
      issuedAt: license.issued_at,
      deviceFingerprint: fingerprint,
      appVersion: version,
      minAppVersion: license.min_app_version,
      maxAppVersion: license.max_app_version,
    })
    const signed = await buildSignedLicense(payload)

    return Response.json(
      { ...signed, graceHours: GRACE_HOURS, lastValidatedAt: iso },
      { status: 200 },
    )
  }),
}