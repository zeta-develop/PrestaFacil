import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// El mock de Supabase SOLO se activa cuando:
//   1. Se habilita explícitamente con NEXT_PUBLIC_ENABLE_MOCK_SUPABASE=true (dev/test), Y
//   2. El entorno NO es producción (NODE_ENV !== "production").
// En producción el mock es imposible: si faltan las credenciales reales, el
// build/arranque falla de forma visible en lugar de usar datos simulados.
// Además, el mock se carga con import dinámico, por lo que el bundler lo
// excluye por completo del bundle de producción (ni siquiera viaja en el artefacto).
const enableMock = process.env.NEXT_PUBLIC_ENABLE_MOCK_SUPABASE === 'true'
const isProduction = process.env.NODE_ENV === 'production'
const shouldUseMock = enableMock && !isProduction

if (!shouldUseMock && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error(
    'Faltan NEXT_PUBLIC_SUPABASE_URL y/o NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
    'Configúralas, o si estás en desarrollo/pruebas sin backend, ' +
    'habilita el mock explícitamente con NEXT_PUBLIC_ENABLE_MOCK_SUPABASE=true ' +
    '(nunca disponible en producción).'
  )
}

export const supabase: SupabaseClient = shouldUseMock
  ? (await import('./mockClient')).mockSupabase as unknown as SupabaseClient
  : createClient(supabaseUrl as string, supabaseAnonKey as string)
