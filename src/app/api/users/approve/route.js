export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getCurrentUser, approveUser, rejectUser, setAdmin } from '@/lib/auth'

export async function POST(req) {
  const token = req.cookies.get('tgarb_session')?.value
  const me = await getCurrentUser(token)
  if (!me || me.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId, action } = await req.json()
  if (action === 'approve') await approveUser(userId)
  else if (action === 'reject') await rejectUser(userId)
  else if (action === 'admin') await setAdmin(userId)
  else return NextResponse.json({ error: 'Unknown action' }, { status: 400 })

  return NextResponse.json({ ok: true })
}
