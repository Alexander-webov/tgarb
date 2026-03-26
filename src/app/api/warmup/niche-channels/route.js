// src/app/api/warmup/niche-channels/route.js
import { NextResponse } from 'next/server'
import { NICHE_CHANNELS } from '@/lib/telegram/warmup'

export async function GET() {
  const result = {}
  for (const [niche, channels] of Object.entries(NICHE_CHANNELS)) {
    result[niche] = { channels, count: channels.length }
  }
  return NextResponse.json(result)
}
