/**
 * Tipos de la base de datos de Supabase (manejados a mano / mínimos para Fase 1).
 *
 * En fases posteriores, cuando haya Edge Functions y más tablas, se puede
 * regenerar automáticamente con `supabase gen types`.
 */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          account_status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          account_status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          account_status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      licenses: {
        Row: {
          id: string
          customer_id: string
          license_key: string
          license_key_hash: string
          product: string
          plan: string
          status: string
          max_activations: number
          issued_at: string
          expires_at: string | null
          min_app_version: string | null
          max_app_version: string | null
          activated_at: string | null
          last_validated_at: string | null
          activation_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          license_key: string
          license_key_hash: string
          product?: string
          plan: string
          status?: string
          max_activations?: number
          issued_at?: string
          expires_at?: string | null
          min_app_version?: string | null
          max_app_version?: string | null
          activated_at?: string | null
          last_validated_at?: string | null
          activation_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Record<keyof Database['public']['Tables']['licenses']['Row'], unknown>>
        Relationships: []
      }
      devices: {
        Row: {
          id: string
          customer_id: string
          fingerprint: string
          device_name: string | null
          os: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          fingerprint: string
          device_name?: string | null
          os?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Record<keyof Database['public']['Tables']['devices']['Row'], unknown>>
        Relationships: []
      }
      license_activations: {
        Row: {
          id: string
          license_id: string
          device_id: string
          status: string
          activated_at: string
          last_validated_at: string | null
          deactivated_at: string | null
        }
        Insert: {
          id?: string
          license_id: string
          device_id: string
          status?: string
          activated_at?: string
          last_validated_at?: string | null
          deactivated_at?: string | null
        }
        Update: Partial<Record<keyof Database['public']['Tables']['license_activations']['Row'], unknown>>
        Relationships: []
      }
      admin_users: {
        Row: {
          id: string
          created_at: string
        }
        Insert: {
          id: string
          created_at?: string
        }
        Update: Partial<Record<keyof Database['public']['Tables']['admin_users']['Row'], unknown>>
        Relationships: []
      }
      app_versions: {
        Row: {
          id: string
          version: string
          url: string | null
          min_app_version: string | null
          release_notes: string | null
          is_current: boolean
          created_at: string
        }
        Insert: {
          id?: string
          version: string
          url?: string | null
          min_app_version?: string | null
          release_notes?: string | null
          is_current?: boolean
          created_at?: string
        }
        Update: Partial<Record<keyof Database['public']['Tables']['app_versions']['Row'], unknown>>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      authorize: {
        Args: { required_role: string }
        Returns: boolean
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}