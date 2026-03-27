// src/app/auth/callback/route.js
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const code  = searchParams.get('code')
  const next  = searchParams.get('next') ?? '/dashboard'

  // Use the public URL from env, not the internal localhost
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.RAILWAY_PUBLIC_DOMAIN && `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` ||
    'https://passionate-courtesy-production.up.railway.app'

  if (code) {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error) {
        return NextResponse.redirect(`${baseUrl}${next}`)
      }
      console.error('exchangeCodeForSession error:', error.message)
    } catch (e) {
      console.error('callback error:', e.message)
    }
  }

  return NextResponse.redirect(`${baseUrl}/login?error=auth_failed`)
}
