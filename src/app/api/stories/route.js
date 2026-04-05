export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const tasks = await prisma.storiesTask.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(tasks)
}

export async function POST(req) {
  const body = await req.json()
  const task = await prisma.storiesTask.create({
    data: {
      name: body.name || 'Масслайкинг',
      accountIds: body.accountIds || [],
      targetUsers: body.targetUsers || [],
      mode: body.mode || 'view',
      limitPerAcc: body.limitPerAcc || 100,
    }
  })
  return NextResponse.json(task, { status: 201 })
}
