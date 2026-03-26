// src/app/api/spy/scan/route.js
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { analyzeChannelForAds } from '@/lib/spy'

export async function POST(req) {
  const { channelUsername, accountId, limit } = await req.json()
  if (!channelUsername || !accountId) {
    return NextResponse.json({ error: 'channelUsername and accountId required' }, { status: 400 })
  }

  // Run in background
  analyzeChannelForAds(accountId, channelUsername, limit || 50).catch(console.error)

  return NextResponse.json({ status: 'scan_started', channel: channelUsername })
}
