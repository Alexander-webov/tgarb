export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@supabase/supabase-js'

export async function GET(req) {
  try {
    const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey   = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey      = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !serviceKey) return NextResponse.json({ user: null })

    // Try to get access token from Authorization header (sent by client)
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.replace('Bearer ', '').trim()

    if (!token) return NextResponse.json({ user: null })

    // Verify token using admin client
    const adminSupabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { data: { user: sbUser }, error } = await adminSupabase.auth.getUser(token)
    if (error || !sbUser) return NextResponse.json({ user: null })

    // Get from our DB
    let user = await prisma.user.findFirst({
      where: { OR: [{ supabaseId: sbUser.id }, { email: sbUser.email }] }
    })

    if (!user) {
      const count = await prisma.user.count()
      user = await prisma.user.create({
        data: {
          email: sbUser.email,
          username: sbUser.user_metadata?.username || sbUser.email.split('@')[0],
          supabaseId: sbUser.id,
          passwordHash: '',
          role: count === 0 ? 'ADMIN' : 'PENDING',
          isApproved: count === 0,
        }
      })
    } else if (!user.supabaseId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { supabaseId: sbUser.id }
      })
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        isApproved: user.isApproved,
      }
    })
  } catch (err) {
    console.error('/api/auth/me error:', err.message)
    return NextResponse.json({ user: null })
  }
}
