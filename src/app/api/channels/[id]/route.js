export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_, { params }) {
  const id = Number(params.id)
  const channel = await prisma.channel.findUnique({ where: { id } })
  return NextResponse.json(channel)
}

export async function PATCH(req, { params }) {
  const id = Number(params.id)
  const body = await req.json()
  const channel = await prisma.channel.update({ where: { id }, data: body })
  return NextResponse.json(channel)
}

export async function DELETE(_, { params }) {
  const id = Number(params.id)
  await prisma.channel.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
