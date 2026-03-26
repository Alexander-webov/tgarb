// src/app/api/warmup/stats/route.js
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const accounts = await prisma.tgAccount.findMany({ orderBy: { warmupDays: 'desc' } })

  const byStatus = accounts.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1
    return acc
  }, {})

  const dayDist = accounts.reduce((acc, a) => {
    const k = String(Math.min(a.warmupDays, 5))
    acc[k] = (acc[k] || 0) + 1
    return acc
  }, {})

  return NextResponse.json({
    total:    accounts.length,
    active:   byStatus.ACTIVE   || 0,
    warming:  byStatus.WARMING  || 0,
    limited:  byStatus.LIMITED  || 0,
    banned:   byStatus.BANNED   || 0,
    offline:  byStatus.OFFLINE  || 0,
    byStatus,
    dayDistribution: dayDist,
    warmupTimeline: accounts.map(a => ({
      id: a.id, phone: a.phone, username: a.username,
      day: a.warmupDays, status: a.status,
      isWarmed: a.isWarmed, sentToday: a.sentToday,
      dailyLimit: a.dailyLimit, niche: a.niche,
    })),
  })
}
