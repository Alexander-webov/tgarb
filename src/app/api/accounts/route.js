export const dynamic = 'force-dynamic'

// src/app/api/accounts/route.js
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const accounts = await prisma.tgAccount.findMany({
    include: { proxy: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(accounts)
}

export async function POST(req) {
  const body = await req.json()
  const account = await prisma.tgAccount.create({
    data: {
      phone:      body.phone,
      dailyLimit: body.dailyLimit ?? 50,
      delayMin:   body.delayMin  ?? 20,
      delayMax:   body.delayMax  ?? 60,
      status:     'OFFLINE',
      niche:      body.niche ?? 'general',
    },
  })
  return NextResponse.json(account, { status: 201 })
}

export async function PATCH(req) {
  const { ids, role, folder, geo } = await req.json()
  if (!ids?.length) return (await import('next/server')).NextResponse.json({ error: 'ids required' }, { status: 400 })
  const { prisma } = await import('@/lib/prisma')
  const { NextResponse } = await import('next/server')
  const data = {}
  if (role !== undefined) data.role = role
  if (folder !== undefined) data.folder = folder
  if (geo !== undefined) data.geo = geo
  await prisma.tgAccount.updateMany({ where: { id: { in: ids } }, data })
  return NextResponse.json({ ok: true, updated: ids.length })
}
