// src/app/api/analytics/dashboard/route.js
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const [
    totalChannels, totalAccounts, activeAccounts,
    sentWeek, conversionsWeek, revenueWeek,
    dailyStats,
  ] = await Promise.all([
    prisma.channel.count(),
    prisma.tgAccount.count(),
    prisma.tgAccount.count({ where: { status: 'ACTIVE' } }),

    prisma.sentMessage.count({
      where: { sentAt: { gte: new Date(Date.now() - 7 * 864e5) } },
    }),
    prisma.conversion.count({
      where: {
        eventType: { in: ['lead', 'sale'] },
        createdAt: { gte: new Date(Date.now() - 7 * 864e5) },
      },
    }),
    prisma.conversion.aggregate({
      _sum: { payout: true },
      where: { createdAt: { gte: new Date(Date.now() - 7 * 864e5) } },
    }),

    // Last 7 days day-by-day
    Promise.all(
      Array.from({ length: 7 }, (_, i) => {
        const d    = new Date(); d.setDate(d.getDate() - (6 - i))
        const from = new Date(d.setHours(0, 0, 0, 0))
        const to   = new Date(d.setHours(23, 59, 59, 999))
        return Promise.all([
          prisma.sentMessage.count({ where: { sentAt: { gte: from, lte: to } } }),
          prisma.conversion.count({ where: { eventType: { in: ['lead','sale'] }, createdAt: { gte: from, lte: to } } }),
          prisma.conversion.aggregate({ _sum: { payout: true }, where: { createdAt: { gte: from, lte: to } } }),
        ]).then(([sent, leads, rev]) => ({
          date: from.toISOString().slice(0, 10),
          day:  from.toLocaleDateString('ru-RU', { weekday: 'short' }),
          sent, leads,
          revenue: +(rev._sum.payout || 0).toFixed(2),
        }))
      })
    ),
  ])

  return NextResponse.json({
    channels:      totalChannels,
    accounts:      totalAccounts,
    activeAccounts,
    sentWeek,
    leadsWeek:     conversionsWeek,
    revenueWeek:   +(revenueWeek._sum.payout || 0).toFixed(2),
    dailyStats,
  })
}
