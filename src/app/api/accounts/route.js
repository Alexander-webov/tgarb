export const dynamic = 'force-dynamic'

// src/app/api/accounts/route.js
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const accounts = await prisma.tgAccount.findMany({
    include: { proxy: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(accounts)
}

export async function POST(req) {
  const body = await req.json()
  const account = await prisma.tgAccount.create({
    data: {
      phone:      body.phone,
      dailyLimit: body.dailyLimit ?? 50,
      delayMin:   body.delayMin  ?? 20,
      delayMax:   body.delayMax  ?? 60,
      status:     'OFFLINE',
      niche:      body.niche ?? 'general',
    },
  })
  return NextResponse.json(account, { status: 201 })
}
