// src/lib/supabase/middleware.js
import { NextResponse } from 'next/server'

export async function updateSession(request) {
  const { pathname } = request.nextUrl

  const isStatic = pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.startsWith('/r/')
  const isPublic = ['/', '/login', '/register'].includes(pathname) || pathname.startsWith('/auth/')
  const isApi    = pathname.startsWith('/api/auth') || pathname === '/api/postback'

  if (isStatic || isPublic || isApi) {
    return NextResponse.next()
  }

  // Check for Supabase session cookie
  const hasSession = request.cookies.getAll().some(c => 
    c.name.startsWith('sb-') && c.name.includes('-auth-token')
  )

  if (!hasSession) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}
