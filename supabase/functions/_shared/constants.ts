/**
 * AROMIA Licensing — constantes compartidas entre Edge Functions.
 * Valores aprobados en el diseño (docs/AROMIA_WEB_diseno_fase2.md §1/§7).
 */
export const PRODUCT = 'AROMIA'

export const LICENSES_PLANS = ['perpetual', 'annual'] as const
export type LicensePlan = (typeof LICENSES_PLANS)[number]

export const LICENSES_STATUS = ['pending', 'active', 'suspended', 'expired', 'revoked'] as const
export type LicenseStatus = (typeof LICENSES_STATUS)[number]

export const ACTIVATIONS_STATUS = ['active', 'inactive', 'revoked'] as const
export type ActivationStatus = (typeof ACTIVATIONS_STATUS)[number]

/** Ventana de gracia offline (D5 aprobado): 168 horas = 7 días. */
export const GRACE_HOURS = 168

/** Prefijo del license_key de presentación. */
export const LICENSE_KEY_PREFIX = 'AROM-'

/** keyId por defecto. Se usa el de las secrets si está configurado. */
export const DEFAULT_KEY_ID = 'kid-2026-01'