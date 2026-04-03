export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { accountPool } from '@/lib/telegram/client'
import { Api } from 'telegram/tl/index.js'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const query     = searchParams.get('query') || ''
  const accountId = Number(searchParams.get('account_id'))
  const niche     = searchParams.get('niche') || ''

  if (!accountId) return NextResponse.json({ error: 'account_id required' }, { status: 400 })

  const client = await accountPool.getClient(accountId)
  if (!client) return NextResponse.json({ error: 'Account not connected' }, { status: 400 })

  const channels = []

  try {
    // Method 1: contacts.Search (works on warmed accounts)
    const result = await client.invoke(
      new Api.contacts.Search({ q: query || niche, limit: 20 })
    )
    for (const c of result.chats) {
      if (c.className === 'Channel' && c.username) {
        channels.push({
          username:     c.username,
          title:        c.title || c.username,
          tgId:         Number(c.id),
          subscribers:  c.participantsCount || null,
          isBroadcast:  c.broadcast || false,
        })
      }
    }
  } catch {
    // Method 2: if contacts.Search fails, try resolving direct username
    if (query && !query.includes(' ')) {
      try {
        const entity = await client.getEntity(query.replace('@', ''))
        if (entity && entity.username) {
          channels.push({
            username:    entity.username,
            title:       entity.title || entity.username,
            tgId:        Number(entity.id),
            subscribers: entity.participantsCount || null,
            isBroadcast: entity.broadcast || false,
          })
        }
      } catch {}
    }
  }

  return NextResponse.json({ query, found: channels.length, channels })
}
