// src/app/api/channels/discover/search/route.js
import { NextResponse } from 'next/server'
import { parser } from '@/lib/telegram/client'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const query     = searchParams.get('query') || ''
  const accountId = Number(searchParams.get('account_id'))
  const limit     = Number(searchParams.get('limit') || 20)

  if (!accountId) return NextResponse.json({ error: 'account_id required' }, { status: 400 })

  const channels = await parser.searchChannels(accountId, query, limit)
  return NextResponse.json({ query, found: channels.length, channels })
}
