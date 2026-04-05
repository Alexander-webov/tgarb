export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const replies = await prisma.autoReply.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(replies)
}

export async function POST(req) {
  const body = await req.json()
  const reply = await prisma.autoReply.create({
    data: {
      name: body.name,
      accountId: body.accountId,
      isActive: false,
      steps: body.steps || [{ trigger: 'any', message: 'Привет! Напишите подробнее.', delay: 2 }],
    }
  })
  return NextResponse.json(reply, { status: 201 })
}

export async function PATCH(req) {
  const body = await req.json()
  const reply = await prisma.autoReply.update({
    where: { id: body.id },
    data: { isActive: body.isActive, steps: body.steps }
  })
  return NextResponse.json(reply)
}
