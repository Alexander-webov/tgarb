export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req) {
  const { accountId, enable } = await req.json()
  const acc = await prisma.tgAccount.findUnique({ where: { id: accountId } })
  if (!acc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (enable) {
    await prisma.tgAccount.update({
      where: { id: accountId },
      data: { status: 'WARMING', warmupDays: 0, isWarmed: false }
    })
    return NextResponse.json({ ok: true, status: 'WARMING', message: `Прогрев запущен для ${acc.phone}` })
  } else {
    await prisma.tgAccount.update({
      where: { id: accountId },
      data: { status: 'OFFLINE' }
    })
    return NextResponse.json({ ok: true, status: 'OFFLINE', message: `Прогрев остановлен для ${acc.phone}` })
  }
}
