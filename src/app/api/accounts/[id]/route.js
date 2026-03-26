// src/app/api/accounts/[id]/route.js
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(_, { params }) {
  const id = Number(params.id)
  await prisma.tgAccount.delete({ where: { id } })
  return NextResponse.json({ status: 'deleted' })
}

export async function PATCH(req, { params }) {
  const id   = Number(params.id)
  const body = await req.json()
  const acc  = await prisma.tgAccount.update({ where: { id }, data: body })
  return NextResponse.json(acc)
}
