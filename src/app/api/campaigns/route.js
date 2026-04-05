export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      accounts: { include: { account: { select: { id: true, phone: true, username: true, status: true, sentToday: true, dailyLimit: true } } } },
      _count: { select: { sentMessages: true } }
    }
  })

  return NextResponse.json(campaigns.map(c => ({
    ...c,
    totalMessages: c._count.sentMessages,
    activeAccounts: c.accounts.filter(a => a.account.status === 'ACTIVE').length,
  })))
}

export async function POST(req) {
  const body = await req.json()
  if (!body.name || !body.messageText) {
    return NextResponse.json({ error: 'name и messageText обязательны' }, { status: 400 })
  }

  const campaign = await prisma.campaign.create({
    data: {
      name: body.name,
      campaignType: body.campaignType || 'DM',
      messageText: body.messageText,
      targetChannels: body.targetChannels || [],
      maxRecipients: body.maxRecipients ? Number(body.maxRecipients) : null,
      delayBetween: body.delayBetween || 30,
      offerUrl: body.offerUrl || null,
      status: 'DRAFT',
    }
  })

  // Link accounts
  if (body.senderAccountIds?.length > 0) {
    await prisma.campaignAccount.createMany({
      data: body.senderAccountIds.map(accountId => ({ campaignId: campaign.id, accountId })),
      skipDuplicates: true,
    })
  }

  return NextResponse.json(campaign, { status: 201 })
}
