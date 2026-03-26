// src/lib/tracker.js
import { prisma } from './prisma.js'
import { nanoid } from 'nanoid'
import { wsManager } from './ws.js'

export async function createTrackLink({ destinationUrl, offerId, campaignId, channelUsername }) {
  const slug = nanoid(8)
  return prisma.trackLink.create({
    data: { slug, destinationUrl, offerId, campaignId, channelUsername },
  })
}

export async function handleClick(slug, ip, userAgent) {
  const link = await prisma.trackLink.findUnique({ where: { slug } })
  if (!link) return null

  await prisma.$transaction([
    prisma.trackLink.update({ where: { id: link.id }, data: { clicks: { increment: 1 } } }),
    prisma.conversion.create({ data: { linkId: link.id, eventType: 'click', ip, userAgent } }),
  ])

  return link.destinationUrl
}

export async function handlePostback(slug, eventType, payout) {
  const link = await prisma.trackLink.findUnique({ where: { slug } })
  if (!link) return false

  await prisma.conversion.create({
    data: { linkId: link.id, eventType, payout: payout ? parseFloat(payout) : null },
  })

  // Update offer stats
  if (link.offerId && eventType !== 'click') {
    await prisma.offer.update({
      where: { id: link.offerId },
      data: {
        leads:   { increment: 1 },
        revenue: { increment: payout ? parseFloat(payout) : 0 },
      },
    })
  }

  // Broadcast conversion via WS
  wsManager.broadcast('conversion', { slug, eventType, payout: parseFloat(payout || 0) })

  return true
}
