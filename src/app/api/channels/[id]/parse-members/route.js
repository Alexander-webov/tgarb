// src/app/api/channels/[id]/parse-members/route.js
import { NextResponse } from 'next/server'
import { scheduleNow } from '@/lib/agenda'

export async function POST(req, { params }) {
  const id = Number(params.id)
  const { searchParams } = new URL(req.url)
  const accountId = Number(searchParams.get('account_id'))
  const limit     = Number(searchParams.get('limit') || 5000)

  await scheduleNow('parse_members', { channelId: id, accountId, limit })
  return NextResponse.json({ status: 'queued', channelId: id })
}
