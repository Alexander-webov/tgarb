export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { registerUser, createToken, storeToken } from '@/lib/auth'

export async function POST(req) {
  const { email, username, password } = await req.json()
  if (!email || !username || !password) return NextResponse.json({ error: 'Заполни все поля' }, { status: 400 })
  if (password.length < 6) return NextResponse.json({ error: 'Пароль минимум 6 символов' }, { status: 400 })

  try {
    const user = await registerUser(email, username, password)
    if (user.role === 'ADMIN') {
      const token = createToken()
      storeToken(token, user.id)
      const res = NextResponse.json({ ok: true, autoLogin: true, role: 'ADMIN' })
      res.cookies.set('tgarb_session', token, {
        httpOnly: true, secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60, path: '/', sameSite: 'lax',
      })
      return res
    }
    return NextResponse.json({ ok: true, pending: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
