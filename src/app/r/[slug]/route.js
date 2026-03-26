// src/app/r/[slug]/route.js
import { redirect } from 'next/navigation'
import { handleClick } from '@/lib/tracker'
import { NextResponse } from 'next/server'

export async function GET(req, { params }) {
  const ip        = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || ''
  const userAgent = req.headers.get('user-agent') || ''
  const url       = await handleClick(params.slug, ip, userAgent)
  if (!url) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.redirect(url, 302)
}
