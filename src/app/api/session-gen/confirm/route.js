// src/app/api/session-gen/confirm/route.js
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { env } from '@/lib/env'

const store = globalThis._tgAuthSessions || (globalThis._tgAuthSessions = new Map())

export async function POST(req) {
  const { phone, code, password } = await req.json()
  if (!phone || !code) {
    return NextResponse.json({ error: 'Нужен телефон и код' }, { status: 400 })
  }

  const stored = store.get(phone)
  if (!stored) {
    return NextResponse.json({
      error: 'Сессия не найдена — запроси код заново. Возможно сервер перезапустился.'
    }, { status: 400 })
  }

  const { client, session, phoneCodeHash } = stored

  try {
    await client.invoke(
      new (await import('telegram/tl/functions/auth/index.js')).SignIn({
        phoneNumber: phone,
        phoneCodeHash,
        phoneCode: code,
      })
    )
  } catch (err) {
    // 2FA needed
    if (err.errorMessage === 'SESSION_PASSWORD_NEEDED') {
      if (!password) {
        return NextResponse.json({ needPassword: true, message: '2FA включён — введи пароль' })
      }
      try {
        const { computeCheck } = await import('telegram/Password.js')
        const pwd = await client.invoke(
          new (await import('telegram/tl/functions/account/index.js')).GetPassword()
        )
        await client.invoke(
          new (await import('telegram/tl/functions/auth/index.js')).CheckPassword({
            password: await computeCheck(pwd, password),
          })
        )
      } catch (e2) {
        return NextResponse.json({ error: `Ошибка 2FA: ${e2.message}` }, { status: 400 })
      }
    } else {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
  }

  const sessionString = session.save()
  const me = await client.getMe()

  // Save to DB
  const existing = await prisma.tgAccount.findUnique({ where: { phone } })
  if (existing) {
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

  store.delete(phone)

  return NextResponse.json({
    ok: true,
    username: me.username,
    message: `Аккаунт ${me.username ? '@' + me.username : phone} успешно добавлен!`,
  })
}
