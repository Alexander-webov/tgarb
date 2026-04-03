export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_, { params }) {
  const id = Number(params.id)
  const ch = await prisma.channel.findUnique({
    where: { id },
    include: { _count: { select: { parsedUsers: true } } }
  })
  return NextResponse.json({ ...ch, parsedCount: ch._count.parsedUsers })
}

export async function PATCH(req, { params }) {
  const id = Number(params.id)
  const body = await req.json()
  const ch = await prisma.channel.update({
    where: { id },
    data: body,
    include: { _count: { select: { parsedUsers: true } } }
  })
  return NextResponse.json({ ...ch, parsedCount: ch._count.parsedUsers })
}

export async function DELETE(_, { params }) {
  const id = Number(params.id)
  await prisma.channel.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
