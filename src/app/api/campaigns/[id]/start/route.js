export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { scheduleNow } from '@/lib/agenda'

export async function POST(_, { params }) {
  const id = Number(params.id)

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: { accounts: { include: { account: true } } }
  })
  if (!campaign) return NextResponse.json({ error: 'Кампания не найдена' }, { status: 404 })

  // Check if there are recipients
  const recipientCount = await prisma.parsedUser.count({
    where: { channel: { username: { in: campaign.targetChannels } } }
  })
  if (recipientCount === 0) {
    return NextResponse.json({
      error: `Нет получателей. Спарси участников из каналов: ${campaign.targetChannels.join(', ')}. Перейди в Каналы → нажми ↓`
    }, { status: 400 })
  }

  // Check accounts
  const campaignAccIds = campaign.accounts.map(a => a.accountId)
  if (campaignAccIds.length > 0) {
    // Check if campaign accounts are active
    const activeAccs = campaign.accounts.filter(a => a.account?.status === 'ACTIVE')
    const bannedAccs = campaign.accounts.filter(a => a.account?.status === 'BANNED')

    if (activeAccs.length === 0) {
      const bannedList = bannedAccs.map(a => a.account?.phone).join(', ')
      return NextResponse.json({
        error: `Все выбранные аккаунты забанены: ${bannedList}. Выбери другие аккаунты или используй авто-ротацию.`
      }, { status: 400 })
    }
  } else {
    // Auto-rotation - check if there are any active accounts at all
    const activeCount = await prisma.tgAccount.count({
      where: { status: 'ACTIVE', sessionData: { not: null } }
    })
    if (activeCount === 0) {
      const banned = await prisma.tgAccount.findMany({ where: { status: 'BANNED' }, select: { phone: true } })
      const bannedMsg = banned.length > 0 ? ` Забанены: ${banned.map(a=>a.phone).join(', ')}.` : ''
      return NextResponse.json({
        error: `Нет активных аккаунтов для рассылки.${bannedMsg} Добавь и подключи рабочий аккаунт.`
      }, { status: 400 })
    }
  }

  // All good - start
  await prisma.campaign.update({ where: { id }, data: { status: 'RUNNING' } })
  await scheduleNow('run_campaign', { campaignId: id })

  return NextResponse.json({ ok: true, recipients: recipientCount })
}
