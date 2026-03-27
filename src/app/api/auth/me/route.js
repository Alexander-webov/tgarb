export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@supabase/supabase-js'

export async function GET(req) {
  try {
    // Get Supabase session from cookie
    const cookieHeader = req.headers.get('cookie') || ''
    
    // Extract sb- token from cookies
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(c => {
        const [k, ...v] = c.trim().split('=')
        return [k, v.join('=')]
      })
    )
    
    // Find the Supabase auth token cookie
    const tokenCookieName = Object.keys(cookies).find(k => 
      k.startsWith('sb-') && k.includes('-auth-token')
    )
    
    if (!tokenCookieName) return NextResponse.json({ user: null })
    
    let tokenData
    try {
      tokenData = JSON.parse(decodeURIComponent(cookies[tokenCookieName]))
    } catch {
      return NextResponse.json({ user: null })
    }
    
    const accessToken = tokenData?.access_token || tokenData?.[0]?.access_token
    if (!accessToken) return NextResponse.json({ user: null })

    // Verify token with Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    const { data: { user: sbUser }, error } = await supabase.auth.getUser(accessToken)
    if (error || !sbUser) return NextResponse.json({ user: null })

    // Get from our DB
    let user = await prisma.user.findFirst({
      where: { OR: [{ supabaseId: sbUser.id }, { email: sbUser.email }] }
    })

    if (!user) {
      // Auto-create
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
