import { createClient } from 'npm:@supabase/supabase-js@2'
import { getPublicKeySecret } from '../_shared/crypto.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SECRET_KEYS = Deno.env.get('SUPABASE_SECRET_KEYS')

function getAdminClient() {
  const url = SUPABASE_URL ?? ''
  let key = ''
  if (SECRET_KEYS) {
    try {
      key = JSON.parse(SECRET_KEYS)['default'] ?? ''
    } catch {
      key = ''
    }
  }
  return createClient(url, key, { auth: { persistSession: false } })
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

export default {
  fetch: async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })

    const client = getAdminClient()
    const { data: versions, error } = await client
      .from('app_versions')
      .select('version, url, release_notes, min_app_version, is_current')
      .eq('is_current', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      return Response.json(
        { error: { message: error.message, code: 'db_error' } },
        { status: 500, headers: cors },
      )
    }

    // Public key pública (verifica, no falsifica) entregada al Desktop (§4.5).
    let publicKey = getPublicKeySecret() ?? null

    return Response.json(
      {
        version: versions?.version ?? null,
        downloadUrl: versions?.url ?? null,
        releaseNotes: versions?.release_notes ?? [],
        minAppVersion: versions?.min_app_version ?? null,
        publicKey,
      },
      { status: 200, headers: cors },
    )
  },
}