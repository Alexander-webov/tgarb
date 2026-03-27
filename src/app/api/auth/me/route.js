export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const supabase = createClient()
  const { data: { user: sbUser } } = await supabase.auth.getUser()
  if (!sbUser) return NextResponse.json({ user: null })

  // Get from our DB
  let user = await prisma.user.findFirst({
    where: { OR: [{ supabaseId: sbUser.id }, { email: sbUser.email }] }
  })

  if (!user) {
    // Auto-create on first login
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
}
