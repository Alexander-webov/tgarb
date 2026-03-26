// src/app/api/proxies/[id]/route.js
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(_, { params }) {
  await prisma.proxy.delete({ where: { id: Number(params.id) } })
  return NextResponse.json({ status: 'deleted' })
}
