// src/app/api/campaigns/route.js
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const campaigns = await prisma.campaign.findMany({
    include: { accounts: { include: { account: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(campaigns)
}

export async function POST(req) {
  const body = await req.json()
  const { senderAccountIds = [], ...rest } = body

  const campaign = await prisma.campaign.create({
    data: {
      ...rest,
      accounts: {
        create: senderAccountIds.map(accountId => ({ accountId })),
      },
    },
    include: { accounts: true },
  })
  return NextResponse.json(campaign, { status: 201 })
}
