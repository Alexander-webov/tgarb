// src/lib/supabase/getMe.js
// Helper to call /api/auth/me with Supabase token

export async function getMe() {
  try {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.access_token) return null

    const res = await fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    })
    const data = await res.json()
    return data.user
  } catch {
    return null
  }
}
