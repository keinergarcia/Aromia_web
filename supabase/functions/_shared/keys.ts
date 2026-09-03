/**
 * AROMIA Licensing — generación del license_key de presentación (§5.3).
 *
 * Formato: AROM-<20+ chars base32 sin 0/O/1/I, ~128 bits> + 1 char checksum.
 * En BD NO se guarda el license_key en claro, solo su hash SHA-256 (§3.2).
 */

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sin 0/O/1/I/L
const ALPHABET_LEN = 32
const KEY_DATA_CHARS = 24 // 24*5 = 120 bits ajustados por el checksum

export function checksumFor(body: number[]): string {
  let sum = 0
  for (const v of body) sum = (sum + v) % ALPHABET_LEN
  return ALPHABET[sum]
}

/** Genera un license_key aleatorio criptográficamente. */
export function generateLicenseKey(prefix = 'AROM-'): string {
  const bytes = crypto.getRandomValues(new Uint8Array(KEY_DATA_CHARS))
  const body: number[] = []
  for (let i = 0; i < KEY_DATA_CHARS; i++) {
    body.push(bytes[i] % ALPHABET_LEN)
  }
  const cs = checksumFor(body)
  return prefix + body.map((v) => ALPHABET[v]).join('') + cs
}

/** Valida el formato y el checksum de un license_key. */
export function isValidLicenseKey(key: string, prefix = 'AROM-'): boolean {
  if (!key.startsWith(prefix)) return false
  const body = key.slice(prefix.length, -1)
  const cs = key[key.length - 1]
  if (body.length !== KEY_DATA_CHARS) return false
  const values: number[] = []
  for (const ch of body) {
    const idx = ALPHABET.indexOf(ch)
    if (idx === -1) return false
    values.push(idx)
  }
  return checksumFor(values) === cs
}

/** SHA-256 del license_key (hash que SÍ se guarda en BD). */
export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}