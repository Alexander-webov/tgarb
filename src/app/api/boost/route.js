export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  return NextResponse.json(await prisma.boostTask.findMany({ orderBy: { createdAt: 'desc' } }))
}
export async function POST(req) {
  const body = await req.json()
  const task = await prisma.boostTask.create({ data: {
    name: body.name || 'Накрутка',
    type: body.type || 'reactions',
    target: body.target,
    postId: body.postId || null,
    emoji: body.emoji || '❤️',
    count: body.count || 100,
    accountIds: body.accountIds || [],
  }})
  return NextResponse.json(task, { status: 201 })
}
