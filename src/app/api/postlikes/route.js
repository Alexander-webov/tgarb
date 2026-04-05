export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { accountPool } from '@/lib/telegram/client'
import { Api } from 'telegram/tl/index.js'

export async function POST(req) {
  const { channel, postIds, emoji, accountIds } = await req.json()
  if (!channel || !postIds?.length || !accountIds?.length) {
    return NextResponse.json({ error: 'channel, postIds и accountIds обязательны' }, { status: 400 })
  }

  const results = { total: 0, done: 0, failed: 0, byPost: {} }

  for (const accId of accountIds) {
    const client = await accountPool.getClient(accId)
    if (!client) continue

    try {
      const entity = await client.getEntity(channel.replace('@', ''))
      for (const postId of postIds) {
        try {
          await client.invoke(new Api.messages.SendReaction({
            peer: entity,
            msgId: Number(postId),
            reaction: [new Api.ReactionEmoji({ emoticon: emoji || '❤️' })],
          }))
          results.done++
          results.byPost[postId] = (results.byPost[postId] || 0) + 1
          await new Promise(r => setTimeout(r, 1500 + Math.random() * 2000))
        } catch (e) {
          results.failed++
        }
      }
    } catch { continue }
    results.total++
  }

  return NextResponse.json(results)
}
