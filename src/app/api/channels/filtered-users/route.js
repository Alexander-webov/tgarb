export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const channelId = Number(searchParams.get('channelId'))
  const hasAvatar = searchParams.get('hasAvatar') // '1' or '0'
  const maxDaysOffline = Number(searchParams.get('maxDaysOffline') || 0)

  if (!channelId) return NextResponse.json({ error: 'channelId required' }, { status: 400 })

  const where = { channelId }

  if (hasAvatar === '1') where.hasAvatar = true
  if (hasAvatar === '0') where.hasAvatar = false

  if (maxDaysOffline > 0) {
    const cutoff = new Date(Date.now() - maxDaysOffline * 24 * 60 * 60 * 1000)
    where.lastOnline = { gte: cutoff }
  }

  const count = await prisma.parsedUser.count({ where })
  const sample = await prisma.parsedUser.findMany({ where, take: 5, select: { username: true, firstName: true, hasAvatar: true, lastOnline: true } })

  return NextResponse.json({ count, sample })
}
