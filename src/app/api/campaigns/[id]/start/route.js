// src/app/api/campaigns/[id]/start/route.js
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { scheduleNow } from '@/lib/agenda'

export async function POST(_, { params }) {
  const id = Number(params.id)
  await prisma.campaign.update({ where: { id }, data: { status: 'RUNNING' } })
  await scheduleNow('run_campaign', { campaignId: id })
  return NextResponse.json({ status: 'started', campaignId: id })
}
