export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parser } from '@/lib/telegram/client'

export async function POST(req, { params }) {
  const id = Number(params.id)
  const { searchParams } = new URL(req.url)
  const accountId = Number(searchParams.get('account_id'))

  if (!accountId) return NextResponse.json({ error: 'account_id required' }, { status: 400 })

  const channel = await prisma.channel.findUnique({ where: { id } })
  if (!channel) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const info = await parser.parseChannelInfo(accountId, channel.username)
  if (!info) return NextResponse.json({ error: 'Не удалось получить данные. Аккаунт подключён?' }, { status: 400 })

  const updated = await prisma.channel.update({
    where: { id },
    data: {
      title: info.title ?? channel.title,
      subscribers: info.subscribers ?? channel.subscribers,
      erPercent: info.erPercent ?? channel.erPercent,
      postsPerDay: info.postsPerDay ?? channel.postsPerDay,
    }
  })

  return NextResponse.json({ ...updated, subscribers: updated.subscribers })
}
