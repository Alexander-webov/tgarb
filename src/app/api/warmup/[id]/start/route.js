// src/app/api/warmup/[id]/start/route.js
import { NextResponse } from 'next/server'
import { scheduleNow } from '@/lib/agenda'

export async function POST(_, { params }) {
  const id = Number(params.id)
  await scheduleNow('warmup_step', { accountId: id })
  return NextResponse.json({ status: 'started', accountId: id })
}
