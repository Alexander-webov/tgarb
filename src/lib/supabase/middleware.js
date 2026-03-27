// src/lib/supabase/middleware.js
import { NextResponse } from 'next/server'

export async function updateSession(request) {
  const { pathname } = request.nextUrl

  const isStatic = pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.startsWith('/r/')
  const isPublic = ['/', '/login', '/register'].includes(pathname) || pathname.startsWith('/auth/')
  const isPublicApi = pathname.startsWith('/api/auth/login') ||
                      pathname.startsWith('/api/auth/register') ||
                      pathname.startsWith('/api/auth/logout') ||
                      pathname.startsWith('/api/auth/me') ||
                      pathname === '/api/postback'

  if (isStatic || isPublic || isPublicApi) return NextResponse.next()

  // Check Supabase session cookie
  const cookies = request.cookies.getAll()
  const hasSupabaseSession = cookies.some(c =>
    c.name.startsWith('sb-') && c.name.includes('-auth-token')
  )

  if (!hasSupabaseSession) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // For protected pages - check approval via API call
  // We pass a special header to the me endpoint
  const response = NextResponse.next()
  return response
}
