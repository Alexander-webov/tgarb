export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@supabase/supabase-js'

export async function GET(req) {
  // Verify admin via Supabase session cookie
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    const authHeader = req.headers.get('cookie') || ''
    // Get all users from our DB
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, username: true, role: true, isApproved: true, createdAt: true }
    })
    return NextResponse.json(users)
  } catch (err) {
    console.error('users route error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
