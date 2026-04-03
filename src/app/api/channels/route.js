export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { accountPool } from '@/lib/telegram/client'
import { Api } from 'telegram/tl/index.js'

export async function GET() {
  const channels = await prisma.channel.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(channels)
}

export async function POST(req) {
  const body = await req.json()
  const username = body.username.replace('@', '').trim()

  // Save to DB first
  const channel = await prisma.channel.upsert({
    where: { username },
    create: {
      username,
      category:    body.category || '',
      isMonitored: body.isMonitored ?? true,
      isParsing:   body.isParsing ?? false,
    },
    update: { category: body.category || '' },
  })

  // Try to fetch real data from Telegram in background
  fetchChannelInfo(channel.id, username).catch(() => {})

  return NextResponse.json(channel, { status: 201 })
}

async function fetchChannelInfo(channelId, username) {
  try {
    // Get any active account
    const account = await prisma.tgAccount.findFirst({ where: { status: 'ACTIVE' } })
    if (!account) return

    const client = await accountPool.getClient(account.id)
    if (!client) return

    const entity = await client.getEntity(username)
    if (!entity) return

    const updates = {
      tgId:  String(entity.id || ''),
      title: entity.title || entity.username || username,
    }

    // Get full channel info
    try {
      const full = await client.invoke(
        new Api.channels.GetFullChannel({ channel: entity })
      )
      updates.subscribers = full.fullChat.participantsCount || null
      updates.description = full.fullChat.about || null

      // Get recent posts for metrics
      const posts = []
      for await (const msg of client.iterMessages(entity, { limit: 20 })) {
        if (msg.message) posts.push({ views: msg.views || 0 })
      }
      if (posts.length > 0) {
        updates.avgViews = Math.round(posts.reduce((s, p) => s + p.views, 0) / posts.length)
        updates.postsPerDay = Math.round(posts.length / 7 * 10) / 10
        if (updates.subscribers && updates.avgViews) {
          updates.erPercent = Math.round(updates.avgViews / updates.subscribers * 1000) / 10
        }
      }
    } catch {}

    await prisma.channel.update({ where: { id: channelId }, data: updates })
  } catch (err) {
    console.error('fetchChannelInfo error:', err.message)
  }
}
