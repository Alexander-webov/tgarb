// src/app/api/funnels/[id]/route.js
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(_, { params }) {
  await prisma.funnel.delete({ where: { id: Number(params.id) } })
  return NextResponse.json({ status: 'deleted' })
}
