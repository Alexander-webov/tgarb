export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { accountPool } from '@/lib/telegram/client'

export async function POST(req) {
  const { accountIds } = await req.json()
  if (!accountIds?.length) return NextResponse.json({ error: 'accountIds required' }, { status: 400 })

  const results = []

  for (const id of accountIds) {
    const acc = await prisma.tgAccount.findUnique({ where: { id } })
    if (!acc) continue

    const client = await accountPool.getClient(id)
    if (!client) {
      results.push({ id, phone: acc.phone, status: 'error', detail: 'Не удалось подключить аккаунт' })
      continue
    }

    try {
      // Send /start to SpamBot
      await client.sendMessage('SpamBot', { message: '/start' })
      await new Promise(r => setTimeout(r, 3000))
      const msgs = await client.getMessages('SpamBot', { limit: 1 })
      const text = msgs?.[0]?.message?.toLowerCase() || ''

      let spamStatus = 'unknown'
      let detail = text.slice(0, 150)

      if (text.includes('free') || text.includes('no limits') || text.includes('нет ограничений') || text.includes('без ограничений')) {
        spamStatus = 'clean'
      } else if (text.includes('limited') || text.includes('spam') || text.includes('ограничен')) {
        spamStatus = 'limited'
      } else if (text.includes('ban') || text.includes('заблокирован')) {
        spamStatus = 'banned'
      }

      // Update in DB
      await prisma.tgAccount.update({
        where: { id },
        data: {
          status: spamStatus === 'banned' ? 'BANNED' : spamStatus === 'limited' ? 'LIMITED' : acc.status,
          banReason: spamStatus === 'limited' || spamStatus === 'banned' ? detail : null,
        }
      })

      results.push({ id, phone: acc.phone, status: spamStatus, detail })
    } catch (err) {
      results.push({ id, phone: acc.phone, status: 'error', detail: err.message })
    }
  }

  return NextResponse.json({ results })
}
