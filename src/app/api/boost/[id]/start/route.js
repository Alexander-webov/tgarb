export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { scheduleNow } from '@/lib/agenda'
export async function POST(_, { params }) {
  const id = Number(params.id)
  await prisma.boostTask.update({ where: { id }, data: { status: 'RUNNING' } })
  await scheduleNow('run_boost', { taskId: id })
  return NextResponse.json({ status: 'started' })
}
