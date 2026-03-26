// src/app/api/accounts/[id]/session/route.js
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req, { params }) {
  const id = Number(params.id)
  const formData = await req.formData()
  const file = formData.get('file')
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const sessionData = await file.text()
  await prisma.tgAccount.update({
    where: { id },
    data: { sessionData, status: 'OFFLINE' },
  })
  return NextResponse.json({ status: 'uploaded' })
}
