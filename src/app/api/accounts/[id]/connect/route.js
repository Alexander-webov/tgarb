// src/app/api/accounts/[id]/connect/route.js
import { NextResponse } from 'next/server'
import { accountPool } from '@/lib/telegram/client'

export async function POST(_, { params }) {
  const id = Number(params.id)
  const client = await accountPool.getClient(id)
  if (!client) {
    return NextResponse.json({ status: 'error', message: 'Connection failed' }, { status: 400 })
  }
  return NextResponse.json({ status: 'connected' })
}
