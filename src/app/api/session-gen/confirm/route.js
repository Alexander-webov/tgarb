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
      error: 'Сессия истекла — запроси код заново'
    }, { status: 400 })
  }

  const { client, session } = stored

  try {
    // Use gramjs high-level signInUser helper
    await client.signInUser(
      { apiId: env.TG_API_ID, apiHash: env.TG_API_HASH },
      {
        phoneNumber: async () => phone,
        phoneCode: async () => code,
        password: password ? async () => password : undefined,
        onError: (err) => { throw err },
      }
    )
  } catch (err) {
    if (err.message?.includes('SESSION_PASSWORD_NEEDED') ||
        err.errorMessage === 'SESSION_PASSWORD_NEEDED') {
      return NextResponse.json({
        needPassword: true,
        message: '2FA включён — введи пароль облачного хранилища Telegram'
      })
    }
    if (err.message?.includes('PHONE_CODE_INVALID') ||
        err.errorMessage === 'PHONE_CODE_INVALID') {
      return NextResponse.json({ error: 'Неверный код — попробуй ещё раз' }, { status: 400 })
    }
    if (err.message?.includes('PHONE_CODE_EXPIRED') ||
        err.errorMessage === 'PHONE_CODE_EXPIRED') {
      store.delete(phone)
      return NextResponse.json({ error: 'Код истёк — запроси новый' }, { status: 400 })
    }
    console.error('session-gen/confirm error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 400 })
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
