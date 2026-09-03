/**
 * AROMIA Licensing — construcción y firma del payload de licencia (§5.1/§5.2).
 *
 * TODO el payload viaja firmado: la firma cubre los bytes exactos del JSON
 * canónico ordenado (§5.1). El Desktop verifica la firma ANTES de leer campos.
 * La private key solo existe en el servidor (Edge Function).
 */

import { GRACE_HOURS, PRODUCT } from './constants.ts'

export interface LicensePayload {
  v: number
  licenseId: string
  keyId: string
  customer: string | null
  product: string
  plan: string
  status: string
  maxActivations: number
  expiresAt: string | null
  issuedAt: string
  graceHours: number
  deviceFingerprint: string
  appVersion: string
  minAppVersion: string | null
  maxAppVersion: string | null
  issuedWithKey: string
}

export interface SignedLicense {
  /** JSON canónico firmado (bytes exactos). */
  canonical: string
  /** Payload ya parseado (mismo contenido que canonical). */
  payload: LicensePayload
  /** Firma Ed25519 en base64 (§5.1). */
  signature: string
}

/**
 * Construye el payload con el orden canónico de §5.1.
 */
export function buildPayload(input: Omit<LicensePayload, 'v' | 'product' | 'graceHours' | 'issuedWithKey' | 'keyId'> & { keyId: string }): LicensePayload {
  return {
    v: 1,
    licenseId: input.licenseId,
    keyId: input.keyId,
    customer: input.customer,
    product: PRODUCT,
    plan: input.plan,
    status: input.status,
    maxActivations: input.maxActivations,
    expiresAt: input.expiresAt,
    issuedAt: input.issuedAt,
    graceHours: GRACE_HOURS,
    deviceFingerprint: input.deviceFingerprint,
    appVersion: input.appVersion,
    minAppVersion: input.minAppVersion,
    maxAppVersion: input.maxAppVersion,
    issuedWithKey: input.keyId,
  }
}

/**
 * Firma el payload: serialize canónico en el orden exacto definido por
 * `buildPayload` (JSON.stringify mantiene el orden de inserción de las claves).
 */
export async function buildSignedLicense(payload: LicensePayload): Promise<SignedLicense> {
  // La importación es estática por si se quiere verificar antes de firmar.
  const { signCanonical } = await import('./crypto.ts')
  const canonical = JSON.stringify(payload)
  const signature = await signCanonical(canonical)
  return { canonical, payload, signature }
}