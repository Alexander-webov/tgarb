// src/app/api/warmup/[id]/niche/route.js
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { NICHE_CHANNELS } from '@/lib/telegram/warmup'

export async function POST(req, { params }) {
  const id   = Number(params.id)
  const body = await req.json()
  if (!NICHE_CHANNELS[body.niche]) {
    return NextResponse.json({ error: 'Unknown niche' }, { status: 400 })
  }
  await prisma.tgAccount.update({ where: { id }, data: { niche: body.niche } })
  return NextResponse.json({ status: 'set', niche: body.niche, channels: NICHE_CHANNELS[body.niche] })
}
