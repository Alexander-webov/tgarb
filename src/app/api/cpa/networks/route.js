// src/app/api/cpa/networks/route.js
import { NextResponse } from 'next/server'
import { env } from '@/lib/env'

export async function GET() {
  return NextResponse.json([
    { id: 'own',       name: 'Собственные',  connected: true,                    icon: '🔗' },
    { id: 'admitad',   name: 'Admitad',      connected: !!env.ADMITAD_TOKEN,     icon: '🟦', setupUrl: 'https://publishers.admitad.com' },
    { id: 'leadgid',   name: 'LeadGid',      connected: !!env.LEADGID_API_KEY,   icon: '🟩', setupUrl: 'https://leadgid.com' },
    { id: 'alfaleads', name: 'Alfaleads',    connected: !!env.ALFALEADS_API_KEY, icon: '🟧', setupUrl: 'https://alfaleads.com' },
  ])
}
