// src/app/api/analytics/roi/route.js
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/analytics/roi — calculate ROI
export async function POST(req) {
  const d = await req.json()
  const totalCost   = (d.accountsCost||0) + (d.proxiesCost||0) + (d.adsBudget||0) + (d.serverCost||30)
  const delivered   = Math.floor((d.messagesSent||1000) * (d.deliveryRate||0.85))
  const clicks      = Math.floor(delivered * (d.clickRate||0.05))
  const leads       = Math.floor(clicks   * (d.conversionRate||0.08))
  const revenue     = leads * (d.avgPayout||25)
  const profit      = revenue - totalCost
  const roiPct      = totalCost > 0 ? +((profit / totalCost) * 100).toFixed(1) : 0
  return NextResponse.json({
    totalCost:         +totalCost.toFixed(2),
    messagesDelivered: delivered,
    clicks, leads,
    revenue:      +revenue.toFixed(2),
    profit:       +profit.toFixed(2),
    roiPct,
    epc:          clicks > 0 ? +(revenue / clicks).toFixed(3) : 0,
    epm:          d.messagesSent > 0 ? +(revenue / d.messagesSent * 1000).toFixed(2) : 0,
    cpl:          leads  > 0 ? +(totalCost / leads).toFixed(2) : 0,
    breakevenLeads: d.avgPayout > 0 ? Math.ceil(totalCost / d.avgPayout) : 0,
    isProfitable: profit > 0,
  })
}

// GET /api/analytics/roi/history
export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const days = Number(searchParams.get('days') || 30)

  const rows = await Promise.all(
    Array.from({ length: days }, (_, i) => {
      const d    = new Date(); d.setDate(d.getDate() - (days - 1 - i))
      const from = new Date(d.setHours(0, 0, 0, 0))
      const to   = new Date(d.setHours(23, 59, 59, 999))
      return Promise.all([
        prisma.sentMessage.count({ where: { isDelivered: true, sentAt: { gte: from, lte: to } } }),
        prisma.conversion.count({ where: { eventType: { in: ['lead','sale'] }, createdAt: { gte: from, lte: to } } }),
        prisma.conversion.aggregate({ _sum: { payout: true }, where: { createdAt: { gte: from, lte: to } } }),
      ]).then(([sent, leads, rev]) => ({
        date:    from.toISOString().slice(0, 10),
        day:     from.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
        sent, leads,
        revenue: +(rev._sum.payout || 0).toFixed(2),
      }))
    })
  )
  return NextResponse.json(rows)
}
