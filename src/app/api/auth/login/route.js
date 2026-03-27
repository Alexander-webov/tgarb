export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { loginUser, createToken, storeToken } from '@/lib/auth'

export async function POST(req) {
  const { login, password } = await req.json()
  if (!login || !password) return NextResponse.json({ error: 'Заполни все поля' }, { status: 400 })

  try {
    const user = await loginUser(login, password)
    const token = createToken()
    storeToken(token, user.id)

    const res = NextResponse.json({ ok: true, user: { id: user.id, username: user.username, role: user.role } })
    res.cookies.set('tgarb_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
      sameSite: 'lax',
    })
    return res
  } catch (err) {
    if (err.message === 'PENDING') {
      return NextResponse.json({ error: 'PENDING', message: 'Ожидайте одобрения администратора' }, { status: 403 })
    }
    return NextResponse.json({ error: err.message }, { status: 401 })
  }
}
