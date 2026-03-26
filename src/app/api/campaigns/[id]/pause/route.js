// src/app/api/campaigns/[id]/pause/route.js
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(_, { params }) {
  const id = Number(params.id)
  await prisma.campaign.update({ where: { id }, data: { status: 'PAUSED' } })
  return NextResponse.json({ status: 'paused' })
}
