export const dynamic = 'force-dynamic'

// src/app/api/tracker/stats/route.js
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const [totalClicks, totalConversions, recentConversions] = await Promise.all([
    prisma.trackLink.aggregate({ _sum: { clicks: true } }),
    prisma.conversion.count({ where: { eventType: { in: ['lead', 'sale'] } } }),
    prisma.conversion.findMany({
      take: 20, orderBy: { createdAt: 'desc' },
      include: { link: { select: { slug: true, destinationUrl: true } } },
    }),
  ])

  const revenue = await prisma.conversion.aggregate({
    _sum: { payout: true },
    where: { payout: { not: null } },
  })

  return NextResponse.json({
    clicks:           totalClicks._sum.clicks || 0,
    conversions:      totalConversions,
    revenue:          +(revenue._sum.payout || 0).toFixed(2),
    recentConversions,
  })
}
