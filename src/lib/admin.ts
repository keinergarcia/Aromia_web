/**
 * Capa de acceso del panel admin a las Edge Functions de licenciamiento.
 * Todo el acceso a datos sensibles pasa por aquí (nunca SQL directo del
 * navegador, salvo la RPC is_admin para el gate de rol).
 */
import { supabase } from '@/lib/supabase/client'
import type { LicenseWithRelations, Profile } from '@/types'

const FUNCTIONS = {
  list: 'admin-list-licenses',
  searchProfiles: 'admin-users-search',
  updateLicense: 'admin-license-update',
  deactivateDevice: 'admin-deactivate-device',
} as const

export interface ListLicensesParams {
  status?: string
  q?: string
  limit?: number
  offset?: number
}

interface FunctionError {
  error: { message: string; code: string; detail?: string }
}

async function invoke<T>(fn: string, payload: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fn, {
    body: JSON.stringify(payload),
  })
  if (error) {
    throw new Error(error.message)
  }
  return data as T
}

export async function isAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_admin')
  if (error) return false
  return Boolean(data)
}

export async function listLicenses(
  params: ListLicensesParams = {},
): Promise<LicenseWithRelations[]> {
  const query = new URLSearchParams()
  if (params.status) query.set('status', params.status)
  if (params.q) query.set('q', params.q)
  if (params.limit) query.set('limit', String(params.limit))
  if (params.offset) query.set('offset', String(params.offset))
  return invoke<{ licenses: LicenseWithRelations[] }>(
    `${FUNCTIONS.list}?${query.toString()}`,
    {},
  ).then((r) => r.licenses)
}

export async function searchProfiles(q: string): Promise<Profile[]> {
  const query = new URLSearchParams({ q })
  return invoke<{ profiles: Profile[] }>(
    `${FUNCTIONS.searchProfiles}?${query.toString()}`,
    {},
  ).then((r) => r.profiles)
}

export type LicenseAction =
  | 'suspend'
  | 'reactivate'
  | 'revoke'
  | 'renew'

export async function updateLicense(
  licenseId: string,
  action: LicenseAction,
  extra: { expires_at?: string | null; plan?: string } = {},
): Promise<void> {
  await invoke<FunctionError>(FUNCTIONS.updateLicense, {
    license_id: licenseId,
    action,
    ...(extra.expires_at !== undefined ? { expires_at: extra.expires_at } : {}),
    ...(extra.plan ? { plan: extra.plan } : {}),
  })
}

export async function deactivateDevice(
  licenseId: string,
  deviceId: string,
): Promise<void> {
  await invoke<FunctionError>(FUNCTIONS.deactivateDevice, {
    license_id: licenseId,
    device_id: deviceId,
  })
}