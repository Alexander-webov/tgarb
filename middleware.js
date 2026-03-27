// middleware.js
import { NextResponse } from 'next/server'

const PUBLIC = ['/login', '/api/auth']

export function middleware(req) {
  const { pathname } = req.nextUrl

  // Allow public paths
  if (PUBLIC.some(p => pathname.startsWith(p))) return NextResponse.next()
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) return NextResponse.next()

  // Check cookie
  const session = req.cookies.get('tgarb_session')?.value
  if (!session) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
