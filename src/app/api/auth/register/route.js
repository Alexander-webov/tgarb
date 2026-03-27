export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req) {
  const { email, username, supabaseId } = await req.json()
  if (!email || !username) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  try {
    // Check if first user
    const count = await prisma.user.count()
    const isFirst = count === 0

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] }
    })

    if (existing) {
      // Update supabaseId if missing
      if (supabaseId && !existing.supabaseId) {
        await prisma.user.update({ where: { id: existing.id }, data: { supabaseId } })
      }
      return NextResponse.json({ ok: true, existing: true })
    }

    await prisma.user.create({
      data: {
        email,
        username,
        supabaseId: supabaseId || null,
        passwordHash: '',
        role: isFirst ? 'ADMIN' : 'PENDING',
        isApproved: isFirst,
      }
    })

    return NextResponse.json({ ok: true, isFirst })
  } catch (err) {
    console.error('register error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
