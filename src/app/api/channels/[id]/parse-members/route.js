export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parser, accountPool } from '@/lib/telegram/client'

export async function POST(req, { params }) {
  const id = Number(params.id)
  const { searchParams } = new URL(req.url)
  const accountId = Number(searchParams.get('account_id'))
  const limit = Number(searchParams.get('limit') || 5000)

  if (!accountId) return NextResponse.json({ error: 'account_id required' }, { status: 400 })

  // Check account
  const account = await prisma.tgAccount.findUnique({ where: { id: accountId } })
  if (!account) return NextResponse.json({ error: 'Аккаунт не найден' }, { status: 404 })
  if (account.status === 'BANNED') return NextResponse.json({ error: `Аккаунт ${account.phone} забанен. Используй другой аккаунт.` }, { status: 400 })

  const channel = await prisma.channel.findUnique({ where: { id } })
  if (!channel) return NextResponse.json({ error: 'Канал не найден' }, { status: 404 })

  // Try to connect first
  const client = await accountPool.getClient(accountId)
  if (!client) return NextResponse.json({ error: 'Не удалось подключить аккаунт. Нажми Wi-Fi на аккаунте.' }, { status: 400 })

  // Check if broadcast channel before queuing
  try {
    const entity = await client.getEntity(channel.username)
    if (entity.broadcast === true) {
      return NextResponse.json({
        error: `@${channel.username} — это broadcast-канал. Telegram не даёт получить список подписчиков каналов. Парсинг работает только для групп и чатов (supergroup). Добавь вместо этого группу обсуждения канала.`,
        type: 'BROADCAST_CHANNEL'
      }, { status: 400 })
    }
  } catch (err) {
    return NextResponse.json({ error: 'Ошибка Telegram: ' + err.message }, { status: 400 })
  }

  // Queue the job
  const { scheduleNow } = await import('@/lib/agenda')
  await scheduleNow('parse_members', { channelId: id, accountId, limit })

  return NextResponse.json({ status: 'queued', channelId: id, username: channel.username })
}
