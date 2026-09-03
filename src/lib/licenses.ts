/**
 * Capa de acceso del panel de cliente (dashboard) a las Edge Functions de
 * licenciamiento. El cliente solo ve SUS propios datos (la autorización la
 * aplica el servidor filtrando por el usuario de la sesión).
 */
import { supabase } from '@/lib/supabase/client'
import type { License, Device, LicenseActivation } from '@/types'

export type MyLicense = License & {
  license_activations: Array<
    LicenseActivation & {
      devices: Pick<Device, 'id' | 'device_name' | 'os' | 'fingerprint'> | null
    }
  >
}

export type MyDevice = Device & {
  license_activations: Array<
    LicenseActivation & {
      licenses: Pick<License, 'id' | 'product' | 'plan' | 'status' | 'expires_at'> | null
    }
  >
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

/** Licencias del cliente autenticado (vía Edge Function, sin license_key). */
export async function myLicenses(): Promise<MyLicense[]> {
  return invoke<{ licenses: MyLicense[] }>('client-my-license', {}).then((r) => r.licenses)
}

/** Dispositivos del cliente autenticado (vía Edge Function). */
export async function myDevices(): Promise<MyDevice[]> {
  return invoke<{ devices: MyDevice[] }>('client-my-devices', {}).then((r) => r.devices)
}

/**
 * Desactiva un dispositivo propio (libera un slot). Requiere sesión: solo el
 * dueño de la licencia (o un admin) puede hacerlo.
 */
export async function deactivateOwnDevice(licenseId: string, fingerprint: string): Promise<void> {
  await invoke<FunctionError>('deactivate-device', {
    license_id: licenseId,
    device_fingerprint: fingerprint,
  })
}
