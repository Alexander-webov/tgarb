// src/app/api/session-gen/start/route.js
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { env } from '@/lib/env'

// Global store shared across requests in same process
const store = globalThis._tgAuthSessions || (globalThis._tgAuthSessions = new Map())

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
      appVersion: '1.0.0',
    })

    await client.connect()

    const result = await client.sendCode(
      { apiId: env.TG_API_ID, apiHash: env.TG_API_HASH },
      phone
    )

    // Store client + phoneCodeHash
    store.set(phone, { client, session, phoneCodeHash: result.phoneCodeHash })

    return NextResponse.json({ ok: true, message: 'Код отправлен в Telegram' })
  } catch (err) {
    console.error('session-gen/start error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
