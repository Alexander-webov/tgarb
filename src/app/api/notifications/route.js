// src/app/api/notifications/route.js
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return NextResponse.json(notifications)
}

export async function PATCH(req) {
  // Mark all as read
  await prisma.notification.updateMany({ data: { isRead: true } })
  return NextResponse.json({ ok: true })
}
