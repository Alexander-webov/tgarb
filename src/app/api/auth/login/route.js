// src/app/api/auth/login/route.js
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createHash, randomBytes } from 'crypto'

function hashPassword(password) {
  return createHash('sha256')
    .update(password + (process.env.AUTH_SECRET || 'tgarb-secret-2024'))
    .digest('hex')
}

export async function POST(req) {
  const { username, password } = await req.json()
  if (!username || !password) {
    return NextResponse.json({ error: 'Введи логин и пароль' }, { status: 400 })
  }

  // Check if any admin exists
  const adminCount = await prisma.adminUser.count()

  if (adminCount === 0) {
    // First time — create admin
    await prisma.adminUser.create({
      data: { username, passwordHash: hashPassword(password) }
    })
  } else {
    // Verify credentials
    const user = await prisma.adminUser.findUnique({ where: { username } })
    if (!user || user.passwordHash !== hashPassword(password)) {
      return NextResponse.json({ error: 'Неверный логин или пароль' }, { status: 401 })
    }
  }

  // Set session cookie
  const token = randomBytes(32).toString('hex')
  const res = NextResponse.json({ ok: true })
  res.cookies.set('tgarb_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
    sameSite: 'lax',
  })
  return res
}
