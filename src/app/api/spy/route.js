// src/app/api/spy/route.js
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const channelId  = searchParams.get('channel_id') ? Number(searchParams.get('channel_id')) : undefined
  const advertiser = searchParams.get('advertiser')
  const limit      = Number(searchParams.get('limit') || 50)

  const posts = await prisma.adPost.findMany({
    where: {
      ...(channelId   && { channelId }),
      ...(advertiser  && { advertiser: { contains: advertiser, mode: 'insensitive' } }),
    },
    include: { channel: { select: { username: true, title: true } } },
    orderBy: { detectedAt: 'desc' },
    take: limit,
  })

  return NextResponse.json(posts)
}
