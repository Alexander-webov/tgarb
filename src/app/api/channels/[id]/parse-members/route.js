export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { scheduleNow } from '@/lib/agenda'

export async function POST(req, { params }) {
  const id = Number(params.id)
  const { searchParams } = new URL(req.url)
  const accountId = Number(searchParams.get('account_id'))
  const limit = Number(searchParams.get('limit') || 5000)

  if (!accountId) return NextResponse.json({ error: 'account_id required' }, { status: 400 })

  const account = await prisma.tgAccount.findUnique({ where: { id: accountId } })
  if (!account) return NextResponse.json({ error: 'Аккаунт не найден' }, { status: 404 })
  if (account.status === 'BANNED') return NextResponse.json({ error: `Аккаунт ${account.phone} забанен. Используй другой аккаунт.` }, { status: 400 })
  if (!account.sessionData) return NextResponse.json({ error: 'Нет сессии у аккаунта.' }, { status: 400 })

  const channel = await prisma.channel.findUnique({ where: { id } })
  if (!channel) return NextResponse.json({ error: 'Канал не найден' }, { status: 404 })

  await scheduleNow('parse_members', { channelId: id, accountId, limit })

  return NextResponse.json({
    status: 'queued',
    channelId: id,
    username: channel.username,
    message: `Парсинг @${channel.username} запущен. Для каналов собираем комментаторов постов (1-5 мин).`
  })
}
