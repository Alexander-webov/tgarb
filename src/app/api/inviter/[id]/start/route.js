export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { scheduleNow } from '@/lib/agenda'

export async function POST(_, { params }) {
  const id = Number(params.id)
  await prisma.inviteTask.update({ where: { id }, data: { status: 'RUNNING' } })
  await scheduleNow('run_inviter', { taskId: id })
  return NextResponse.json({ status: 'started' })
}
