export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const tasks = await prisma.inviteTask.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(tasks)
}

export async function POST(req) {
  const body = await req.json()
  const task = await prisma.inviteTask.create({
    data: {
      name: body.name || 'Инвайт задача',
      targetChat: body.targetChat,
      accountIds: body.accountIds || [],
      limitPerAcc: body.limitPerAcc || 25,
      delaySeconds: body.delaySeconds || 10,
    }
  })
  return NextResponse.json(task, { status: 201 })
}
