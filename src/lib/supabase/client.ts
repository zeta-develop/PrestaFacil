import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { mockSupabase } from './mockClient'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Si hay credenciales reales, se usa el cliente real de Supabase.
// Si no las hay (entornos de prueba/desarrollo), se usa una simulación local
// en memoria para poder correr la app sin conexión ni credenciales.
// El cast es solo de tipos: en runtime el mock implementa el subconjunto usado.
export const supabase: SupabaseClient = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (mockSupabase as unknown as SupabaseClient)
