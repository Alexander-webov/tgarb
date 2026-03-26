// src/app/api/channels/route.js
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const channels = await prisma.channel.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(channels)
}

export async function POST(req) {
  const body = await req.json()
  const username = body.username.replace('@', '')
  const channel = await prisma.channel.upsert({
    where: { username },
    create: { username, category: body.category, isMonitored: body.isMonitored ?? true, isParsing: body.isParsing ?? false },
    update: { category: body.category },
  })
  return NextResponse.json(channel, { status: 201 })
}
