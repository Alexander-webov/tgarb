export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@supabase/supabase-js'

async function getCallerRole(req) {
  const auth = req.headers.get('authorization') || ''
  const token = auth.replace('Bearer ', '').trim()
  if (!token) return null

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { data: { user: sbUser } } = await supabase.auth.getUser(token)
  if (!sbUser) return null

  const user = await prisma.user.findFirst({
    where: { OR: [{ supabaseId: sbUser.id }, { email: sbUser.email }] }
  })
  return user?.role || null
}

export async function POST(req) {
  const role = await getCallerRole(req)
  if (role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId, action } = await req.json()

  if (action === 'approve') {
    await prisma.user.update({ where: { id: userId }, data: { isApproved: true, role: 'USER' } })
  } else if (action === 'reject') {
    await prisma.user.update({ where: { id: userId }, data: { isApproved: false, role: 'PENDING' } })
  } else if (action === 'admin') {
    await prisma.user.update({ where: { id: userId }, data: { isApproved: true, role: 'ADMIN' } })
  } else {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
