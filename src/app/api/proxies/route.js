// src/app/api/proxies/route.js
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const proxies = await prisma.proxy.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(proxies)
}

export async function POST(req) {
  const body = await req.json()
  const proxy = await prisma.proxy.create({
    data: {
      host:      body.host,
      port:      Number(body.port),
      proxyType: body.proxyType || 'socks5',
      username:  body.username  || null,
      password:  body.password  || null,
      country:   body.country   || null,
    },
  })
  return NextResponse.json(proxy, { status: 201 })
}
