export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { accountPool } from '@/lib/telegram/client'
import { scheduleNow } from '@/lib/agenda'

export async function POST(req) {
  const { sourceChat, targetChat, accountId, limit } = await req.json()
  if (!sourceChat || !targetChat || !accountId) return NextResponse.json({ error: 'sourceChat, targetChat, accountId обязательны' }, { status: 400 })
  await scheduleNow('run_cloner', { sourceChat, targetChat, accountId, limit: limit || 100 })
  return NextResponse.json({ status: 'queued', message: `Клонирование ${sourceChat} → ${targetChat} запущено` })
}
