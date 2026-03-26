// src/app/api/auth/login/route.js
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { verifyCredentials, createAdmin, hasAdmin, setSession, createSessionToken, hashPassword } from '@/lib/auth'

export async function POST(req) {
  const { username, password } = await req.json()
  if (!username || !password) {
    return NextResponse.json({ error: 'Введи логин и пароль' }, { status: 400 })
  }

  // First launch — create admin automatically
  const adminExists = await hasAdmin()
  if (!adminExists) {
    await createAdmin(username, password)
    const token = createSessionToken()
    const res = NextResponse.json({ ok: true, firstTime: true })
    res.cookies.set('tgarb_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })
    return res
  }

  const ok = await verifyCredentials(username, password)
  if (!ok) {
    return NextResponse.json({ error: 'Неверный логин или пароль' }, { status: 401 })
  }

  const token = createSessionToken()
  const res = NextResponse.json({ ok: true })
  res.cookies.set('tgarb_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  })
  return res
}
