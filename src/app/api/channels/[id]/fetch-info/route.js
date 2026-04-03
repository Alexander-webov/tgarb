export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parser } from '@/lib/telegram/client'

export async function POST(req, { params }) {
  const id = Number(params.id)
  const { searchParams } = new URL(req.url)
  const accountId = Number(searchParams.get('account_id'))

  if (!accountId) return NextResponse.json({ error: 'account_id required' }, { status: 400 })

  const channel = await prisma.channel.findUnique({ where: { id } })
  if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 })

  try {
    const info = await parser.parseChannelInfo(accountId, channel.username)
    if (!info) return NextResponse.json({ error: 'Could not fetch channel info' }, { status: 400 })

    const updated = await prisma.channel.update({
      where: { id },
      data: {
        title: info.title,
        subscribers: info.subscribers,
        erPercent: info.erPercent,
        postsPerDay: info.postsPerDay,
        about: info.about,
        lastParsedAt: new Date(),
      }
    })

    return NextResponse.json(updated)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
