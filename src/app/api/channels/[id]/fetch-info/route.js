export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { accountPool, parser } from '@/lib/telegram/client'

export async function POST(req, { params }) {
  const id = Number(params.id)
  const { searchParams } = new URL(req.url)
  const accountId = Number(searchParams.get('account_id'))

  if (!accountId) return NextResponse.json({ error: 'account_id required' }, { status: 400 })

  const account = await prisma.tgAccount.findUnique({ where: { id: accountId } })
  if (!account) return NextResponse.json({ error: 'Аккаунт не найден' }, { status: 404 })
  if (account.status === 'BANNED') return NextResponse.json({ error: `Аккаунт ${account.phone} забанен${account.banReason ? ': ' + account.banReason : ''}. Импортируй новый аккаунт.` }, { status: 400 })
  if (!account.sessionData) return NextResponse.json({ error: 'Нет сессии. Импортируй аккаунт заново.' }, { status: 400 })

  const channel = await prisma.channel.findUnique({ where: { id } })
  if (!channel) return NextResponse.json({ error: 'Канал не найден' }, { status: 404 })

  const client = await accountPool.getClient(accountId)
  if (!client) {
    const acc = await prisma.tgAccount.findUnique({ where: { id: accountId } })
    if (acc?.status === 'BANNED') return NextResponse.json({ error: `Аккаунт забанен${acc.banReason ? ': ' + acc.banReason : ''}` }, { status: 400 })
    return NextResponse.json({ error: 'Не удалось подключиться к Telegram. Нажми Wi-Fi на аккаунте.' }, { status: 400 })
  }

  try {
    const info = await parser.parseChannelInfo(accountId, channel.username)
    if (!info) return NextResponse.json({ error: 'Telegram не вернул данные. Канал приватный?' }, { status: 400 })

    const updated = await prisma.channel.update({
      where: { id },
      data: {
        title: info.title ?? channel.title,
        subscribers: info.subscribers ?? channel.subscribers,
        erPercent: info.erPercent ?? channel.erPercent,
        postsPerDay: info.postsPerDay ?? channel.postsPerDay,
      }
    })

    return NextResponse.json(updated)
  } catch (err) {
    // Return exact Telegram error to user
    const msg = err.message || 'Неизвестная ошибка'
    if (msg.includes('CHANNEL_PRIVATE')) return NextResponse.json({ error: 'Канал приватный — аккаунт не подписан' }, { status: 400 })
    if (msg.includes('USERNAME_INVALID')) return NextResponse.json({ error: 'Неверный username канала' }, { status: 400 })
    if (msg.includes('FLOOD')) return NextResponse.json({ error: 'FloodWait — Telegram просит подождать. Попробуй через несколько минут.' }, { status: 429 })
    if (msg.includes('AUTH_KEY') || msg.includes('SESSION')) return NextResponse.json({ error: 'Сессия устарела. Переподключи аккаунт.' }, { status: 400 })
    return NextResponse.json({ error: 'Ошибка Telegram: ' + msg }, { status: 500 })
  }
}
