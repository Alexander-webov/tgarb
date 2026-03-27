export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getCurrentUser, getAllUsers } from '@/lib/auth'

export async function GET(req) {
  const token = req.cookies.get('tgarb_session')?.value
  const me = await getCurrentUser(token)
  if (!me || me.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const users = await getAllUsers()
  return NextResponse.json(users)
}
