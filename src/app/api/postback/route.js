// src/app/api/postback/route.js
import { NextResponse } from 'next/server'
import { handlePostback } from '@/lib/tracker'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const subId     = searchParams.get('sub_id') || ''
  const eventType = searchParams.get('event')  || 'lead'
  const payout    = searchParams.get('payout') || '0'

  const ok = await handlePostback(subId, eventType, payout)
  if (ok && eventType !== 'click') {
    const { notifyConversion } = await import('@/lib/notifications')
    await notifyConversion(subId, payout).catch(() => {})
  }
  return NextResponse.json({ status: ok ? 'ok' : 'not_found' })
}
