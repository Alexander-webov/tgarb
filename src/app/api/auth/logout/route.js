// src/app/api/auth/logout/route.js
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete('tgarb_session')
  return res
}
