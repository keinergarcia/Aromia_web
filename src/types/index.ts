import type { Database } from './supabase'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type License = Database['public']['Tables']['licenses']['Row']
export type Device = Database['public']['Tables']['devices']['Row']
export type LicenseActivation = Database['public']['Tables']['license_activations']['Row']
export type AdminUser = Database['public']['Tables']['admin_users']['Row']
export type AppVersion = Database['public']['Tables']['app_versions']['Row']

/** Licencia con sus relaciones (perfil del cliente, activaciones y dispositivos). */
export interface LicenseWithRelations extends License {
  profiles: Pick<Profile, 'id' | 'email' | 'full_name'> | null
  license_activations: Array<
    LicenseActivation & { devices: Pick<Device, 'id' | 'device_name' | 'os' | 'fingerprint'> | null }
  >
}

export type LicenseStatus = 'pending' | 'active' | 'suspended' | 'expired' | 'revoked'