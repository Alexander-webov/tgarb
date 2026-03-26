// src/lib/spy.js
import { prisma } from './prisma.js'
import pino from 'pino'

const logger = pino({ name: 'spy' })

// Keywords that indicate a paid post
const AD_MARKERS = [
  'реклама', 'партнёрский', 'промокод', 'promo', 'скидка', 'акция',
  'перейти', 'ссылка в', 'подробнее', '👇', '➡️', '🔗', 'регистрация',
  'переходи', 'жми', 'подписывайся', 'бонус', 'депозит', 'регистрируйся',
]

// URL regex
const URL_REGEX = /https?:\/\/[^\s\)]+/g

export function isAdPost(text) {
  if (!text) return false
  const lower = text.toLowerCase()
  const hasAdMarker = AD_MARKERS.some(m => lower.includes(m))
  const hasUrl = URL_REGEX.test(text)
  return hasAdMarker && hasUrl
}

export function extractUrls(text) {
  if (!text) return []
  return (text.match(URL_REGEX) || [])
    .filter(url => !url.includes('t.me/') || url.includes('t.me/+'))
    .slice(0, 3)
}

export function guessAdvertiser(text, urls) {
  if (!urls.length) return null
  try {
    const url = new URL(urls[0])
    return url.hostname.replace('www.', '')
  } catch {
    return null
  }
}

export async function analyzeChannelForAds(accountId, channelUsername, limit = 50) {
  const { accountPool } = await import('./telegram/client.js')

  const channel = await prisma.channel.findUnique({
    where: { username: channelUsername.replace('@', '') }
  })
  if (!channel) return { found: 0 }

  const client = await accountPool.getClient(accountId)
  if (!client) return { found: 0 }

  let found = 0
  try {
    for await (const msg of client.iterMessages(channelUsername.replace('@', ''), { limit })) {
      if (!msg.message || !isAdPost(msg.message)) continue

      const urls = extractUrls(msg.message)
      const advertiser = guessAdvertiser(msg.message, urls)

      await prisma.adPost.upsert({
        where: { channelId_tgMsgId: { channelId: channel.id, tgMsgId: msg.id } },
        create: {
          channelId: channel.id,
          tgMsgId: msg.id,
          text: msg.message.slice(0, 1000),
          offerUrl: urls[0] || null,
          advertiser,
          views: msg.views || 0,
        },
        update: {
          views: msg.views || 0,
        },
      })
      found++
    }
  } catch (err) {
    logger.error({ channelUsername, err: err.message }, 'Spy error')
  }

  logger.info({ channelUsername, found }, 'Spy analysis done')
  return { found }
}
