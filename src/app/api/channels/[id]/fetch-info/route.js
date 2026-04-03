export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { accountPool, parser } from '@/lib/telegram/client'

export async function POST(req, { params }) {
  const id = Number(params.id)
  const { searchParams } = new URL(req.url)
  const accountId = Number(searchParams.get('account_id'))

  if (!accountId) return NextResponse.json({ error: 'account_id required' }, { status: 400 })

  // Check account status first
  const account = await prisma.tgAccount.findUnique({ where: { id: accountId } })
  if (!account) return NextResponse.json({ error: 'Аккаунт не найден в БД' }, { status: 404 })
  if (account.status === 'BANNED') return NextResponse.json({ error: `Аккаунт ${account.phone} забанен. Импортируй новый аккаунт.` }, { status: 400 })
  if (!account.sessionData) return NextResponse.json({ error: 'У аккаунта нет сессии. Импортируй аккаунт заново.' }, { status: 400 })

  const channel = await prisma.channel.findUnique({ where: { id } })
  if (!channel) return NextResponse.json({ error: 'Канал не найден' }, { status: 404 })

  // Try to connect
  const client = await accountPool.getClient(accountId)
  if (!client) {
    // Get updated status after connect attempt
    const updated = await prisma.tgAccount.findUnique({ where: { id: accountId } })
    const reason = updated?.banReason || 'неизвестно'
    const status = updated?.status
    if (status === 'BANNED') return NextResponse.json({ error: `Аккаунт забанен: ${reason}` }, { status: 400 })
    return NextResponse.json({ error: 'Не удалось подключить аккаунт к Telegram. Попробуй нажать Wi-Fi на аккаунте.' }, { status: 400 })
  }

  try {
    const info = await parser.parseChannelInfo(accountId, channel.username)
    if (!info) return NextResponse.json({ error: 'Telegram не вернул данные по каналу @' + channel.username }, { status: 400 })

    const updatedChannel = await prisma.channel.update({
      where: { id },
      data: {
        title: info.title ?? channel.title,
        subscribers: info.subscribers ?? channel.subscribers,
        erPercent: info.erPercent ?? channel.erPercent,
        postsPerDay: info.postsPerDay ?? channel.postsPerDay,
      }
    })

    return NextResponse.json(updatedChannel)
  } catch (err) {
    return NextResponse.json({ error: 'Ошибка Telegram: ' + err.message }, { status: 500 })
  }
}
