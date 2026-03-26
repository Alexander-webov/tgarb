// src/app/api/cpa/stats/route.js
import { NextResponse } from 'next/server'
import { getAllNetworkStats } from '@/lib/cpa'

export async function GET() {
  const stats = await getAllNetworkStats()
  return NextResponse.json(stats)
}
