// src/app/api/session-gen/confirm/route.js
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { env } from '@/lib/env'

// Shared in-memory store (same process as start route in Next.js)
// In production use Redis for this
const authSessions = globalThis._authSessions || (globalThis._authSessions = new Map())

export async function POST(req) {
  const { phone, code, password } = await req.json()
  if (!phone || !code) return NextResponse.json({ error: 'Нужен телефон и код' }, { status: 400 })

  const stored = authSessions.get(phone)
  if (!stored) {
    return NextResponse.json({ error: 'Сессия не найдена. Запроси код заново.' }, { status: 400 })
  }

  try {
    const { client, session } = stored

    await client.signIn(
      { apiId: env.TG_API_ID, apiHash: env.TG_API_HASH },
      {
        phoneNumber: phone,
        phoneCode: async () => code,
        password: password ? async () => password : undefined,
        onError: (err) => { throw err },
      }
    )

    const sessionString = session.save()
    const me = await client.getMe()

    // Save session to account in DB or create new
    const existingAcc = await prisma.tgAccount.findUnique({ where: { phone } })
    if (existingAcc) {
      await prisma.tgAccount.update({
        where: { phone },
        data: {
          sessionData: sessionString,
          username: me.username || null,
          firstName: me.firstName || null,
          status: 'OFFLINE',
        },
      })
    } else {
      await prisma.tgAccount.create({
        data: {
          phone,
          sessionData: sessionString,
          username: me.username || null,
          firstName: me.firstName || null,
          status: 'OFFLINE',
          dailyLimit: 50,
          warmupDays: 0,
          niche: 'general',
        },
      })
    }

    authSessions.delete(phone)

    return NextResponse.json({
      ok: true,
      sessionString,
      username: me.username,
      message: `Аккаунт @${me.username || phone} успешно добавлен!`,
    })
  } catch (err) {
    if (err.message?.includes('SESSION_PASSWORD_NEEDED') || err.errorMessage === 'SESSION_PASSWORD_NEEDED') {
      return NextResponse.json({ needPassword: true, message: '2FA включён — введи пароль' })
    }
    return NextResponse.json({ error: `Ошибка: ${err.message}` }, { status: 500 })
  }
}
