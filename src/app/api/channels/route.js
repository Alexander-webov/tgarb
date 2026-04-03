export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parser } from '@/lib/telegram/client'

export async function GET() {
  const channels = await prisma.channel.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { parsedUsers: true } } }
  })
  return NextResponse.json(channels.map(c => ({
    ...c,
    parsedCount: c._count.parsedUsers,
  })))
}

export async function POST(req) {
  const body = await req.json()
  const username = (body.username || '').replace('@', '').trim()
  if (!username) return NextResponse.json({ error: 'username required' }, { status: 400 })

  const channel = await prisma.channel.upsert({
    where: { username },
    create: {
      username,
      category: body.category || null,
      isMonitored: body.isMonitored ?? true,
      isParsing: body.isParsing ?? false,
    },
    update: { category: body.category || null },
  })

  // Try to fetch channel info automatically if there's an active account
  const activeAcc = await prisma.tgAccount.findFirst({
    where: { status: 'ACTIVE', sessionData: { not: null } }
  })

  if (activeAcc) {
    try {
      const info = await parser.parseChannelInfo(activeAcc.id, username)
      if (info) {
        await prisma.channel.update({
          where: { id: channel.id },
          data: {
            title: info.title,
            subscribers: info.subscribers,
            erPercent: info.erPercent,
            postsPerDay: info.postsPerDay,
            lastParsedAt: new Date(),
          }
        })
      }
    } catch (e) {
      console.error('Auto fetch channel info failed:', e.message)
    }
  }

  const updated = await prisma.channel.findUnique({
    where: { id: channel.id },
    include: { _count: { select: { parsedUsers: true } } }
  })

  return NextResponse.json({ ...updated, parsedCount: updated._count.parsedUsers }, { status: 201 })
}
