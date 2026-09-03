/**
 * AROMIA Licensing — criptografía Ed25519 en Deno (WebCrypto nativo).
 *
 * La private key SOLO existe en las secrets de la Edge Function
 * (AROMIA_SIGNING_PRIVATE_KEY). Nunca se expone al cliente. Según el diseño
 * §2.2, en Deno es nativo; el Desktop verifica con NSec/libsodium.
 *
 * Formato de la secret:
 *   - AROMIA_SIGNING_PRIVATE_KEY: base64 (raw, 32 bytes PKCS8 DER) o PEM PKCS8.
 *   - AROMIA_SIGNING_PUBLIC_KEY:  base64 (raw, 32 bytes SPKI DER) o PEM SPKI.
 *   - AROMIA_KEY_ID:              identificador de clave ("kid-2026-01").
 */

const isPem = (v: string) => /-----BEGIN/.test(v)

/** Convierte raw/PEM a un Uint8Array DER para crypto.subtle.importKey. */
function keyToDer(raw: string): Uint8Array {
  if (isPem(raw)) {
    const body = raw
      .replace(/-----BEGIN [^-]+-----/g, '')
      .replace(/-----END [^-]+-----/g, '')
      .replace(/\s+/g, '')
    const bin = atob(body)
    const out = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
    return out
  }
  const bin = atob(raw)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export function getPrivateKeySecret(): string | undefined {
  return Deno.env.get('AROMIA_SIGNING_PRIVATE_KEY')
}

export function getPublicKeySecret(): string | undefined {
  return Deno.env.get('AROMIA_SIGNING_PUBLIC_KEY')
}

export function getKeyId(): string {
  return Deno.env.get('AROMIA_KEY_ID') ?? 'kid-2026-01'
}

let privateKey: CryptoKey | null = null

/** Carga (y cachea) la CryptoKey privada Ed25519 para firmar. */
export async function getSigningKey(): Promise<CryptoKey> {
  if (privateKey) return privateKey
  const secret = getPrivateKeySecret()
  if (!secret) throw new Error('AROMIA_SIGNING_PRIVATE_KEY no configurada')
  privateKey = await crypto.subtle.importKey(
    'pkcs8',
    keyToDer(secret),
    { name: 'Ed25519' } as AesKeyAlgorithm,
    false,
    ['sign'],
  )
  return privateKey
}

let publicKey: CryptoKey | null = null

/** Carga (y cachea) la CryptoKey pública Ed25519 para verificar. */
export async function getVerificationKey(): Promise<CryptoKey> {
  if (publicKey) return publicKey
  const secret = getPublicKeySecret()
  if (!secret) return getSigningKey()
  publicKey = await crypto.subtle.importKey(
    'spki',
    keyToDer(secret),
    { name: 'Ed25519' } as AesKeyAlgorithm,
    false,
    ['verify'],
  )
  return publicKey
}

/**
 * Firma los bytes canónicos del payload (§5.1) con Ed25519.
 * Devuelve la firma en base64.
 */
export async function signCanonical(canonical: string): Promise<string> {
  const key = await getSigningKey()
  const bytes = new TextEncoder().encode(canonical)
  const sig = await crypto.subtle.sign({ name: 'Ed25519' } as AesKeyAlgorithm, key, bytes)
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
}

/**
 * Verifica la firma base64 sobre el canonical (uso en pruebas/validación
 * previa del lado servidor si se necesita).
 */
export async function verifyCanonical(canonical: string, signatureB64: string): Promise<boolean> {
  const key = await getVerificationKey()
  const bytes = new TextEncoder().encode(canonical)
  const sig = Uint8Array.from(atob(signatureB64), (c) => c.charCodeAt(0))
  return crypto.subtle.verify({ name: 'Ed25519' } as AesKeyAlgorithm, key, sig, bytes)
}

/** Public key en base64 (raw), para entregarla vía get-latest-version al Desktop. */
export async function exportPublicKeyB64(): Promise<string> {
  const key = await getVerificationKey()
  const exported = await crypto.subtle.exportKey('spki', key)
  return btoa(String.fromCharCode(...new Uint8Array(exported)))
}