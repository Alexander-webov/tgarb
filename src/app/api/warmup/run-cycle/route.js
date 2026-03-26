// src/app/api/warmup/run-cycle/route.js
import { NextResponse } from 'next/server'
import { scheduleNow } from '@/lib/agenda'

export async function POST() {
  await scheduleNow('warmup_cycle', {})
  return NextResponse.json({ status: 'cycle_started' })
}
