export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { scheduleNow } from '@/lib/agenda'

export async function POST(_, { params }) {
  const id = Number(params.id)
  
  // Set status to WARMING if not already
  await prisma.tgAccount.update({
    where: { id },
    data: { status: 'WARMING' }
  })
  
  await scheduleNow('warmup_step', { accountId: id })
  return NextResponse.json({ status: 'started', accountId: id })
}
