// ── OFFERS ────────────────────────────────────────────────
// src/app/api/offers/route.js
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const network  = searchParams.get('network')
  const category = searchParams.get('category')
  const offers   = await prisma.offer.findMany({
    where: {
      isActive: true,
      ...(network  && { network }),
      ...(category && { category }),
    },
    orderBy: { payout: 'desc' },
  })
  return NextResponse.json(offers)
}

export async function POST(req) {
  const body = await req.json()
  const offer = await prisma.offer.create({ data: body })
  return NextResponse.json(offer, { status: 201 })
}
