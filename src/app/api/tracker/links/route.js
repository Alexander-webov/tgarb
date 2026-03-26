// src/app/api/tracker/links/route.js
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createTrackLink } from '@/lib/tracker'

export async function GET() {
  const links = await prisma.trackLink.findMany({
    include: { offer: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(links)
}

export async function POST(req) {
  const body = await req.json()
  const link = await createTrackLink(body)
  const baseUrl = process.env.TRACKER_BASE_URL || 'http://localhost:3000/r'
  return NextResponse.json({ ...link, shortUrl: `${baseUrl}/${link.slug}` }, { status: 201 })
}
