// src/lib/supabase/client.js
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

let client = null

export function createClient() {
  if (client) return client
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!url || !key) {
    throw new Error('@supabase/ssr: Your project\'s URL and API key are required to create a Supabase client!\nCheck your Supabase project\'s API settings to find these values\nhttps://supabase.com/dashboard/project/_/settings/api')
  }
  
  client = createSupabaseClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  })
  
  return client
}
