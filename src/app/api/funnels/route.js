// src/app/api/funnels/route.js
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const funnels = await prisma.funnel.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(funnels)
}

export async function POST(req) {
  const body = await req.json()
  const funnel = await prisma.funnel.create({
    data: {
      name:     body.name,
      offerUrl: body.offerUrl || null,
      steps:    body.steps   || [],
      isActive: true,
    },
  })
  return NextResponse.json(funnel, { status: 201 })
}
