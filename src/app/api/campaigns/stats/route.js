export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const campaignId = Number(searchParams.get('id'))
  if (!campaignId) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const [campaign, messages] = await Promise.all([
    prisma.campaign.findUnique({ where: { id: campaignId } }),
    prisma.sentMessage.findMany({
      where: { campaignId },
      include: { account: { select: { phone: true } } },
      orderBy: { sentAt: 'desc' },
      take: 50,
    })
  ])

  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const byAccount = {}
  for (const m of messages) {
    const phone = m.account?.phone || 'unknown'
    if (!byAccount[phone]) byAccount[phone] = { sent: 0, failed: 0 }
    if (m.isDelivered) byAccount[phone].sent++
    else byAccount[phone].failed++
  }

  return NextResponse.json({
    campaign,
    byAccount,
    recentLog: messages.slice(0, 20).map(m => ({
      time: m.sentAt,
      account: m.account?.phone,
      delivered: m.isDelivered,
      error: m.error,
    }))
  })
}
