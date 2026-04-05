export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { accountPool } from '@/lib/telegram/client'
import { prisma } from '@/lib/prisma'

export async function POST(_, { params }) {
  const id = Number(params.id)

  const account = await prisma.tgAccount.findUnique({ where: { id } })
  if (!account) return NextResponse.json({ status: 'error', message: 'Аккаунт не найден в БД' }, { status: 404 })
  if (!account.sessionData) return NextResponse.json({ status: 'error', message: 'Нет файла сессии. Импортируй аккаунт заново через «Импорт JSON».' }, { status: 400 })

  const client = await accountPool.getClient(id)

  if (!client) {
    // Check updated status after failed connect
    const updated = await prisma.tgAccount.findUnique({ where: { id } })
    if (updated?.status === 'BANNED') {
      return NextResponse.json({
        status: 'error',
        message: `Аккаунт ${account.phone} забанен Telegram${updated.banReason ? ': ' + updated.banReason : ''}. Этот аккаунт больше нельзя использовать — импортируй новый.`
      }, { status: 400 })
    }
    return NextResponse.json({
      status: 'error',
      message: 'Не удалось подключиться. Возможные причины: сессия устарела, аккаунт удалён, или проблема с сетью. Попробуй импортировать аккаунт заново.'
    }, { status: 400 })
  }

  return NextResponse.json({ status: 'connected', phone: account.phone })
}
