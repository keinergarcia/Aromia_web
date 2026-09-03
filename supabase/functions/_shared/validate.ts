/**
 * AROMIA Licensing — validación y sanitización de entradas (zod no usado aquí).
 */

import { LICENSES_PLANS } from './constants.ts'

/** Normaliza un plan a su valor canónico o null si es inválido. */
export function planOrNull(raw: string | undefined | null): string | null {
  if (!raw) return null
  const v = raw.trim().toLowerCase()
  return (LICENSES_PLANS as readonly string[]).includes(v) ? v : null
}

/** Normaliza un estado de licencia o null si es inválido. */
export function statusOrNull(raw: string | undefined | null): string | null {
  if (!raw) return null
  const v = raw.trim().toLowerCase()
  return ['pending', 'active', 'suspended', 'expired', 'revoked'].includes(v) ? v : null
}

/** Devuelve false si el valor no es uno de los planes permitidos. */
export function isPlan(v: string): boolean {
  return planOrNull(v) !== null
}

/** Trimea y devuelve null si vacío. */
export function sanitize(v: string | undefined | null): string | null {
  if (!v) return null
  const t = v.trim()
  return t === '' ? null : t
}

/** Acepta una versión semver/arbitraria como texto, devuelve null si vacío. */
export function appVersion(v: string | undefined | null): string | null {
  const t = sanitize(v)
  return t
}

/**
 * Producto por plan (producto fijo del catálogo para licencias; el plan
 * modula el valor pero el producto es siempre AROMIA).
 */
export function productAndPlan(_plan: string): string {
  return 'AROMIA'
}

/**
 * Compara dos versiones semver de forma numérica (no lexicográfica).
 * `"9.0.0" < "10.0.0"` y `"2.0.0" < "10.0.0"` son correctos.
 * Soporta `major.minor.patch` opcional (cada segmento numérico).
 *
 * @returns `< 0` si a < b, `0` si son iguales, `> 0` si a > b.
 */
export function semverCompare(a: string, b: string): number {
  const parse = (v: string): number[] =>
    v
      .trim()
      .split('.')
      .map((part) => {
        const n = Number.parseInt(part, 10)
        return Number.isFinite(n) ? n : 0
      })

  const av = parse(a)
  const bv = parse(b)
  const len = Math.max(av.length, bv.length)
  for (let i = 0; i < len; i++) {
    const x = av[i] ?? 0
    const y = bv[i] ?? 0
    if (x !== y) return x - y
  }
  return 0
}

/** `true` si la versión `version` está dentro del rango [min, max] inclusive. */
export function versionInRange(version: string, min: string | null, max: string | null): boolean {
  if (min && semverCompare(version, min) < 0) return false
  if (max && semverCompare(version, max) > 0) return false
  return true
}