export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { deleteToken } from '@/lib/auth'

export async function POST(req) {
  const token = req.cookies.get('tgarb_session')?.value
  if (token) deleteToken(token)
  const res = NextResponse.json({ ok: true })
  res.cookies.delete('tgarb_session')
  return res
}
