// workers/agenda.js
// Agenda — простой планировщик задач на MongoDB
// Запуск: node workers/agenda.js

import Agenda from 'agenda'
import cron from 'node-cron'
import pino from 'pino'

const logger = pino({ name: 'agenda' })

// ── Agenda instance ───────────────────────────────────────
const agenda = new Agenda({
  db: {
    address: process.env.MONGODB_URL || 'mongodb://mongo:27017/tgarb_jobs',
    collection: 'jobs',
    options: { serverSelectionTimeoutMS: 5000 },
  },
  processEvery: '10 seconds',
  maxConcurrency: 5,
})

// ══════════════════════════════════════════════════════════
//  JOB DEFINITIONS
// ══════════════════════════════════════════════════════════

// ── Рассылка кампании ─────────────────────────────────────
agenda.define('run_campaign', { concurrency: 3 }, async (job) => {
  const { campaignId } = job.attrs.data
  logger.info({ campaignId }, 'Running campaign')

  const { prisma } = await import('../src/lib/prisma.js')
  const { accountPool, sender } = await import('../src/lib/telegram/client.js')
  const { wsManager } = await import('../src/lib/ws.js')

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { accounts: { include: { account: true } } },
  })

  if (!campaign || campaign.status !== 'RUNNING') return

  const recipients = await prisma.parsedUser.findMany({
    where: { channel: { username: { in: campaign.targetChannels } } },
    take: campaign.maxRecipients || 10000,
  })

  let sent = 0, failed = 0
  const accounts = campaign.accounts.map(a => a.account)
  let accIdx = 0

  for (const user of recipients) {
    // Rotate accounts
    const account = accounts[accIdx % accounts.length]
    if (!account || account.sentToday >= account.dailyLimit) {
      accIdx++
      continue
    }

    // Random delay
    const delay = account.delayMin + Math.random() * (account.delayMax - account.delayMin)
    await new Promise(r => setTimeout(r, delay * 1000))

    const result = await sender.sendDM(account.id, user.tgUserId, campaign.messageText)

    if (result.ok) {
      sent++
      await prisma.tgAccount.update({
        where: { id: account.id },
        data: { sentToday: { increment: 1 } },
      })
      await prisma.sentMessage.create({
        data: {
          campaignId, accountId: account.id,
          recipientId: user.tgUserId, isDelivered: true,
        },
      })
    } else {
      failed++
      await prisma.sentMessage.create({
        data: {
          campaignId, accountId: account.id,
          recipientId: user.tgUserId, isDelivered: false,
          error: result.error || 'unknown',
        },
      })

      if (result.peerFlood) {
        await prisma.tgAccount.update({
          where: { id: account.id },
          data: { status: 'LIMITED' },
        })
        const { notifyFloodWait } = await import('../src/lib/notifications.js')
        await notifyFloodWait(account.phone, 'PeerFlood - переключаем аккаунт').catch(() => {})
        accIdx++ // Smart rotation - move to next account
      }
      if (result.floodWait) {
        const { notifyFloodWait } = await import('../src/lib/notifications.js')
        await notifyFloodWait(account.phone, result.floodWait).catch(() => {})
        // Smart rotation - switch account instead of waiting
        accIdx++
        // Continue with next account immediately
      }
    }

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { sentCount: sent, deliveredCount: sent, failedCount: failed },
    })

    // WS broadcast every 50
    if ((sent + failed) % 50 === 0) {
      wsManager.broadcast('campaign_progress', {
        campaignId, sent, total: recipients.length, failed,
        pct: Math.round(sent / recipients.length * 100),
      })
    }
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: 'DONE', sentCount: sent, deliveredCount: sent, failedCount: failed },
  })

  wsManager.broadcast('campaign_progress', {
    campaignId, sent, total: recipients.length, failed, pct: 100,
  })

  const { notifyCampaignDone } = await import('../src/lib/notifications.js')
  await notifyCampaignDone(campaign.name, sent, 0).catch(() => {})
  logger.info({ campaignId, sent, failed }, 'Campaign done')
})

// ── Парсинг участников канала ─────────────────────────────
agenda.define('parse_members', { concurrency: 2 }, async (job) => {
  const { channelId, accountId, limit } = job.attrs.data
  logger.info({ channelId, accountId }, 'Parsing members')

  const { prisma } = await import('../src/lib/prisma.js')
  const { parser } = await import('../src/lib/telegram/client.js')

  const channel = await prisma.channel.findUnique({ where: { id: channelId } })
  if (!channel) return

  const members = await parser.parseMembers(accountId, channel.username, limit)
  logger.info({ channelId, count: members.length }, 'Members parsed')
})

// ── Парсинг постов канала ─────────────────────────────────
agenda.define('parse_posts', async (job) => {
  const { channelId, accountId } = job.attrs.data
  const { prisma } = await import('../src/lib/prisma.js')
  const { parser } = await import('../src/lib/telegram/client.js')

  const channel = await prisma.channel.findUnique({ where: { id: channelId } })
  if (!channel) return

  const info = await parser.parseChannelInfo(accountId, channel.username)
  if (!info) return

  // Upsert channel metadata
  await prisma.channel.update({
    where: { id: channelId },
    data: {
      tgId: info.tgId, title: info.title,
      description: info.description, subscribers: info.subscribers,
      avgViews: info.avgViews, erPercent: info.erPercent,
      postsPerDay: info.postsPerDay,
    },
  })

  // Save posts
  for (const post of info.posts) {
    await prisma.post.upsert({
      where: { channelId_tgMsgId: { channelId, tgMsgId: post.tgMsgId } },
      create: { channelId, ...post },
      update: { views: post.views, reactions: post.reactions },
    })
  }
})

// ── Прогрев аккаунтов ─────────────────────────────────────
agenda.define('warmup_step', async (job) => {
  const { accountId } = job.attrs.data
  const { smartWarmupStep } = await import('../src/lib/telegram/warmup.js')
  const result = await smartWarmupStep(accountId)
  logger.info({ accountId, ...result }, 'Warmup step')
})

agenda.define('warmup_cycle', async () => {
  logger.info('Running warmup cycle')
  const { prisma } = await import('../src/lib/prisma.js')

  const accounts = await prisma.tgAccount.findMany({
    where: {
      status: { in: ['WARMING', 'OFFLINE'] },
      sessionData: { not: null },
    },
  })

  for (const acc of accounts) {
    await agenda.now('warmup_step', { accountId: acc.id })
    await new Promise(r => setTimeout(r, Math.random() * 60000 + 30000))
  }
})

// ── Служебные ─────────────────────────────────────────────
agenda.define('reset_daily_limits', async () => {
  const { prisma } = await import('../src/lib/prisma.js')
  await prisma.tgAccount.updateMany({ data: { sentToday: 0 } })
  logger.info('Daily limits reset')
})

agenda.define('check_proxies', async () => {
  const { prisma } = await import('../src/lib/prisma.js')
  const proxies = await prisma.proxy.findMany()

  for (const proxy of proxies) {
    const start = Date.now()
    try {
      // Simple TCP ping via socks
      const { SocksClient } = await import('socks')
      await SocksClient.createConnection({
        proxy: { host: proxy.host, port: proxy.port, type: 5,
                 userId: proxy.username || undefined,
                 password: proxy.password || undefined },
        command: 'connect',
        destination: { host: '8.8.8.8', port: 80 },
      })
      await prisma.proxy.update({
        where: { id: proxy.id },
        data: { pingMs: Date.now() - start, isActive: true },
      })
    } catch {
      await prisma.proxy.update({
        where: { id: proxy.id },
        data: { pingMs: null, isActive: false },
      })
    }
  }
})

// ══════════════════════════════════════════════════════════
//  START
// ══════════════════════════════════════════════════════════
async function start() {
  await agenda.start()
  logger.info('Agenda started')

  // Schedule recurring jobs
  await agenda.every('0 0 * * *',   'reset_daily_limits')
  await agenda.every('*/30 * * * *', 'check_proxies')
  await agenda.every('0 */2 * * *',  'warmup_cycle')

  logger.info('Scheduled jobs registered')

  // Graceful shutdown
  process.on('SIGTERM', gracefulStop)
  process.on('SIGINT',  gracefulStop)
}

async function gracefulStop() {
  logger.info('Stopping agenda...')
  await agenda.stop()
  process.exit(0)
}

// Export for use in API routes
export { agenda }

start().catch(err => {
  logger.error(err, 'Failed to start agenda')
  process.exit(1)
})
