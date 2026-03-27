export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@supabase/supabase-js'

export async function GET(req) {
  try {
    const auth = req.headers.get('authorization') || ''
    const token = auth.replace('Bearer ', '').trim()
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { data: { user: sbUser } } = await supabase.auth.getUser(token)
    if (!sbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const caller = await prisma.user.findFirst({
      where: { OR: [{ supabaseId: sbUser.id }, { email: sbUser.email }] }
    })
    if (!caller || caller.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, username: true, role: true, isApproved: true, createdAt: true }
    })
    return NextResponse.json(users)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
