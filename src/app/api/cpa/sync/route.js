export const dynamic = 'force-dynamic'

// src/app/api/cpa/sync/route.js
import { NextResponse } from 'next/server'
import { admitadService, leadgidService, alfaleadsService } from '@/lib/cpa'
import { prisma } from '@/lib/prisma'

export async function POST() {
  // Run sync in background
  syncAllNetworks().catch(console.error)
  return NextResponse.json({ status: 'sync_started' })
}

async function syncAllNetworks() {
  const services = [
    [admitadService,   'admitad'],
    [leadgidService,   'leadgid'],
    [alfaleadsService, 'alfaleads'],
  ]
  for (const [service, network] of services) {
    try {
      const offers = await service.getOffers()
      for (const o of offers) {
        await prisma.offer.upsert({
          where: { id: -1 }, // will never match — force create
          create: {
            name: o.name, description: o.description, category: o.category,
            network, externalId: o.id, destinationUrl: o.siteUrl || o.previewUrl || '',
            payout: o.payout, currency: o.currency || 'USD',
            payoutType: o.payoutType || 'CPA', isActive: true,
          },
          update: { name: o.name, payout: o.payout },
        }).catch(() => {
          // Upsert by externalId+network
          return prisma.offer.upsert({
            where: { id: 0 },
            create: {
              name: o.name, description: o.description, category: o.category,
              network, externalId: o.id, destinationUrl: o.siteUrl || '',
              payout: o.payout, currency: o.currency || 'USD',
              payoutType: o.payoutType || 'CPA', isActive: true,
            },
            update: { payout: o.payout },
          }).catch(() => {}) // already exists
        })
      }
    } catch (err) {
      console.error(`Sync ${network} error:`, err.message)
    }
  }
}
