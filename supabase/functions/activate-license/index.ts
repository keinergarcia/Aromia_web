import { withSupabase } from 'npm:@supabase/server'
import { isValidLicenseKey, sha256Hex } from '../_shared/keys.ts'
import { buildPayload, buildSignedLicense } from '../_shared/payload.ts'
import { getKeyId } from '../_shared/crypto.ts'
import { appVersion, sanitize, versionInRange } from '../_shared/validate.ts'
import { GRACE_HOURS } from '../_shared/constants.ts'

export default {
  fetch: withSupabase({ auth: 'none' }, async (req: Request, ctx) => {
    // D1: no requiere sesión web; basta poseer un license_key válido + fingerprint.
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return Response.json(
        { error: { message: 'JSON inválido', code: 'bad_request' } },
        { status: 400 },
      )
    }

    const licenseKey =
      typeof body.license_key === 'string' ? body.license_key.trim().toUpperCase() : ''
    const fingerprint = sanitize(body.device_fingerprint as string)
    const deviceName = sanitize(body.device_name as string)
    const os = sanitize(body.os as string)
    const version = appVersion(body.app_version as string)

    if (!licenseKey || !fingerprint || !version) {
      return Response.json(
        { error: { message: 'Campos requeridos', code: 'bad_request' } },
        { status: 400 },
      )
    }
    if (!isValidLicenseKey(licenseKey)) {
      return Response.json(
        { error: { message: 'Clave inválida', code: 'invalid_key' } },
        { status: 400 },
      )
    }

    const licenseKeyHash = await sha256Hex(licenseKey)

    // Buscar la licencia por hash. La clave en claro nunca se guarda.
    const { data: license, error: licErr } = await ctx.supabaseAdmin
      .from('licenses')
      .select('id, customer_id, plan, status, max_activations, expires_at, issued_at, product, min_app_version, max_app_version, activated_at')
      .eq('license_key_hash', licenseKeyHash)
      .maybeSingle()

    if (licErr) {
      return Response.json(
        { error: { message: 'Error de base de datos', code: 'db_error' } },
        { status: 500 },
      )
    }
    if (!license) {
      // No existe: 404 → el Desktop debe desactivarse (§7).
      return Response.json(
        { error: { message: 'Licencia no encontrada', code: 'not_found' } },
        { status: 404 },
      )
    }

    // Solo active puede activar (§1.3).
    if (license.status !== 'active') {
      return Response.json(
        {
          error: {
            message: 'Licencia no activa',
            code: license.status === 'suspended' ? 'suspended' : 'license_state',
          },
        },
        { status: 403 },
      )
    }

    const now = Date.now()
    if (license.expires_at && new Date(license.expires_at).getTime() <= now) {
      return Response.json(
        { error: { message: 'Licencia expirada', code: 'expired' } },
        { status: 410 },
      )
    }

    // Compatibilidad de versión (§1.4).
    if (!versionInRange(version ?? '', license.min_app_version, license.max_app_version)) {
      return Response.json(
        { error: { message: 'Versión no compatible', code: 'version_not_supported' } },
        { status: 403 },
      )
    }

    // Conteo server-side de activaciones activas. Nunca se confía en el cliente.
    const { count, error: countErr } = await ctx.supabaseAdmin
      .from('license_activations')
      .select('id', { count: 'exact', head: true })
      .eq('license_id', license.id)
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
        { status: 403 },
      )
    }

    // El dispositivo debe pertenecer al same customer de la licencia.
    // Si el fingerprint ya existe para otro cliente → rechazar (evita usar
    // la misma máquina bajo varias cuentas).
    const { data: existingDevice, error: devErr } = await ctx.supabaseAdmin
      .from('devices')
      .select('id, customer_id')
      .eq('fingerprint', fingerprint)
      .maybeSingle()

    if (devErr) {
      return Response.json(
        { error: { message: 'Error de base de datos', code: 'db_error' } },
        { status: 500 },
      )
    }

    let deviceId: string
    if (existingDevice) {
      if (existingDevice.customer_id !== license.customer_id) {
        return Response.json(
          { error: { message: 'Dispositivo vinculado a otra cuenta', code: 'device_conflict' } },
          { status: 403 },
        )
      }
      deviceId = existingDevice.id
    } else {
      const { data: newDevice, error } = await ctx.supabaseAdmin
        .from('devices')
        .insert({
          customer_id: license.customer_id,
          fingerprint,
          device_name: deviceName,
          os,
        })
        .select('id')
        .single()
      if (error || !newDevice) {
        return Response.json(
          { error: { message: error?.message ?? 'Error de base de datos', code: 'db_error' } },
          { status: 500 },
        )
      }
      deviceId = newDevice.id
    }

    // Registrar activación activa (upsert idempotente por licencia+dispositivo).
    const { data: activation, error: actErr } = await ctx.supabaseAdmin
      .from('license_activations')
      .upsert(
        {
          license_id: license.id,
          device_id: deviceId,
          status: 'active',
          activated_at: new Date(now).toISOString(),
          last_validated_at: new Date(now).toISOString(),
          deactivated_at: null,
        },
        { onConflict: 'license_id,device_id' },
      )
      .select('id')
      .single()

    if (actErr || !activation) {
      return Response.json(
        { error: { message: actErr?.message ?? 'Error de base de datos', code: 'db_error' } },
        { status: 500 },
      )
    }

    // Firmar el payload §5.1 YA con deviceFingerprint.
    const payload = buildPayload({
      licenseId: license.id,
      keyId: getKeyId(),
      customer: null, // ver nombre en profiles si se quiere (opcional)
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

    // Recalcular activation_count a partir del conteo ACTIVO real en BD (fuente
    // de verdad única), evitando drift/race entre la proyección y el query previo.
    const { count: activeCount, error: recountErr } = await ctx.supabaseAdmin
      .from('license_activations')
      .select('id', { count: 'exact', head: true })
      .eq('license_id', license.id)
      .eq('status', 'active')

    await ctx.supabaseAdmin
      .from('licenses')
      .update({
        activation_count: recountErr ? (count ?? 0) + 1 : (activeCount ?? 0),
        activated_at: license.activated_at ?? new Date(now).toISOString(),
        last_validated_at: new Date(now).toISOString(),
      })
      .eq('id', license.id)

    return Response.json(
      {
        ...signed,
        graceHours: GRACE_HOURS,
      },
      { status: 200 },
    )
  }),
}