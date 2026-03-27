export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req) {
  const token = req.cookies.get('tgarb_session')?.value
  const user = await getCurrentUser(token)
  if (!user) return NextResponse.json({ user: null })
  return NextResponse.json({
    user: { id: user.id, username: user.username, email: user.email, role: user.role, isApproved: user.isApproved }
  })
}
