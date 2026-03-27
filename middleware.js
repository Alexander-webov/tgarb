// middleware.js
import { NextResponse } from 'next/server'

const PUBLIC = ['/login', '/register', '/api/auth/login', '/api/auth/register', '/api/auth/logout']

export function middleware(req) {
  const { pathname } = req.nextUrl

  // Always allow
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) return NextResponse.next()
  if (pathname.startsWith('/r/')) return NextResponse.next() // tracker
  if (PUBLIC.some(p => pathname.startsWith(p))) return NextResponse.next()

  // Check session cookie
  const session = req.cookies.get('tgarb_session')?.value
  if (!session) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Check pending status via header (set by login route)
  const userStatus = req.cookies.get('tgarb_status')?.value
  if (userStatus === 'PENDING') {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
