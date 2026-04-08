// workers/agenda.js
// Agenda — простой планировщик задач на MongoDB
// Запуск: node workers/agenda.js

import Agenda from 'agenda'
import cron from 'node-cron'
import pino from 'pino'

const logger = pino({ name: 'agenda' })
let antiban = null
async function getAntiban() {
  if (!antiban) antiban = await import('../src/lib/antiban.js')
  return antiban
}

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
agenda.define('run_campaign', { concurrency: 1 }, async (job) => {
  const { campaignId } = job.attrs.data
  logger.info({ campaignId }, 'Running campaign')

  const { prisma } = await import('../src/lib/prisma.js')
  const { sender } = await import('../src/lib/telegram/client.js')
  const { wsManager } = await import('../src/lib/ws.js')
  const { randomizeMessage, getDelay } = await import('../src/lib/antiban.js')

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { accounts: { include: { account: true } } },
  })

  if (!campaign || campaign.status !== 'RUNNING') {
    logger.info({ campaignId }, 'Campaign not running, skip')
    return
  }

  // Get recipients
  const alreadySent = await prisma.sentMessage.findMany({
    where: { campaignId }, select: { recipientId: true },
  })
  const sentIds = new Set(alreadySent.map(s => s.recipientId.toString()))

  const allRecipients = await prisma.parsedUser.findMany({
    where: { channel: { username: { in: campaign.targetChannels } } },
    take: campaign.maxRecipients || 10000,
  })
  const pending = allRecipients.filter(u => !sentIds.has(u.tgUserId.toString()))

  logger.info({ campaignId, pending: pending.length }, 'Recipients loaded')

  if (pending.length === 0) {
    await prisma.campaign.update({ where: { id: campaignId }, data: { status: 'DONE' } })
    await notify('campaign_done', `Рассылка «${campaign.name}» завершена`, { campaignId })
    return
  }

  // Determine accounts to use
  let accountList = campaign.accounts.map(a => a.account).filter(a => a?.status === 'ACTIVE')
  if (accountList.length === 0) {
    accountList = await prisma.tgAccount.findMany({
      where: { status: 'ACTIVE', sessionData: { not: null } }
    })
  }

  logger.info({ campaignId, accounts: accountList.map(a => a.phone) }, 'Accounts for campaign')

  if (accountList.length === 0) {
    await prisma.campaign.update({ where: { id: campaignId }, data: { status: 'PAUSED' } })
    await notify('info', `Рассылка «${campaign.name}»: нет активных аккаунтов`, { campaignId })
    return
  }

  let sent = campaign.sentCount || 0
  let failed = campaign.failedCount || 0
  let sessionCount = 0
  let accIdx = 0

  for (const user of pending) {
    // Check campaign still running
    const cur = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { status: true } })
    if (!cur || cur.status !== 'RUNNING') { logger.info({ campaignId }, 'Campaign stopped'); break }

    // Pick account with round-robin rotation
    let account = null
    for (let i = 0; i < accountList.length; i++) {
      const candidate = accountList[accIdx % accountList.length]
      accIdx++
      const fresh = await prisma.tgAccount.findUnique({ where: { id: candidate.id } })
      if (fresh?.status === 'ACTIVE' && fresh.sentToday < (fresh.dailyLimit || 50)) {
        account = fresh
        break
      }
    }

    if (!account) {
      logger.warn({ campaignId }, 'All accounts at limit')
      await prisma.campaign.update({ where: { id: campaignId }, data: { status: 'PAUSED', sentCount: sent, failedCount: failed } })
      await notify('info', `Рассылка «${campaign.name}»: все аккаунты достигли дневного лимита`, { campaignId })
      break
    }

    // Session break every 20 messages
    if (sessionCount > 0 && sessionCount % 20 === 0) {
      const breakSec = 120 + Math.random() * 180
      logger.info({ campaignId, breakSec: Math.round(breakSec) }, 'Session break')
      await new Promise(r => setTimeout(r, breakSec * 1000))
    }

    // Randomize + delay
    const messageText = randomizeMessage(campaign.messageText)
    const delaySec = Math.max(campaign.delayBetween || 30, 10) + (Math.random() * 10 - 5)
    logger.info({ campaignId, account: account.phone, delay: Math.round(delaySec) }, 'Sending...')
    await new Promise(r => setTimeout(r, delaySec * 1000))

    const result = await sender.sendDM(account.id, user.tgUserId, messageText)
    logger.info({ campaignId, ok: result.ok, error: result.error }, 'Send result')

    if (result.ok) {
      sent++
      sessionCount++
      await prisma.tgAccount.update({ where: { id: account.id }, data: { sentToday: { increment: 1 } } })
      await prisma.sentMessage.create({
        data: { campaignId, accountId: account.id, recipientId: user.tgUserId, isDelivered: true },
      })
    } else {
      const errMsg = result.error || ''
      if (!errMsg.includes('PRIVACY') && !errMsg.includes('privacy') && !errMsg.includes('DEACTIVATED')) {
        failed++
        await prisma.sentMessage.create({
          data: { campaignId, accountId: account.id, recipientId: user.tgUserId, isDelivered: false, error: errMsg.slice(0, 200) },
        })
      }
      if (errMsg.includes('FLOOD') || errMsg.includes('PEER_FLOOD')) {
        await prisma.tgAccount.update({ where: { id: account.id }, data: { status: 'LIMITED' } })
        await notify('limited', `Аккаунт ${account.phone}: FloodWait. Переключаем.`, { campaignId })
      } else if (errMsg.includes('AUTH_KEY') || errMsg.includes('SESSION_REVOKED') || errMsg.includes('DEACTIVATED_BAN')) {
        await prisma.tgAccount.update({ where: { id: account.id }, data: { status: 'BANNED', banReason: errMsg.slice(0,100) } })
        await notify('ban', `Аккаунт ${account.phone} забанен!`, { campaignId })
      }
    }

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { sentCount: sent, deliveredCount: sent, failedCount: failed },
    })
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: 'DONE', sentCount: sent, deliveredCount: sent, failedCount: failed },
  })
  await notify('campaign_done', `Рассылка «${campaign.name}» завершена: отправлено ${sent}, ошибок ${failed}`, { campaignId })
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
  logger.info({ accountId }, 'warmup_step START')
  try {
    // Only warm accounts explicitly in WARMING status
    const { prisma } = await import('../src/lib/prisma.js')
    const acc = await prisma.tgAccount.findUnique({ where: { id: accountId } })
    if (!acc) { logger.warn({ accountId }, 'Account not found'); return }
    if (acc.status !== 'WARMING') {
      logger.info({ accountId, status: acc.status }, 'Skipping - account not in WARMING mode')
      return
    }
    if (acc.isWarmed || acc.warmupDays >= 5) {
      await prisma.tgAccount.update({ where: { id: accountId }, data: { isWarmed: true } })
      logger.info({ accountId }, 'Account fully warmed')
      await notify('warmup_done', `Аккаунт ${acc.phone} прогрет за ${acc.warmupDays} дней — готов к работе!`, { accountId })
      return
    }
    const { smartWarmupStep } = await import('../src/lib/telegram/warmup.js')
    const result = await smartWarmupStep(accountId)
    logger.info({ accountId, ...result }, 'warmup_step DONE')
    if (result.status === 'banned') {
      await notify('ban', `Аккаунт #${accountId} забанен во время прогрева`, { accountId })
    } else if (result.status === 'limited') {
      await notify('limited', `Аккаунт #${accountId} ограничен SpamBot`, { accountId })
    } else if (result.actions > 0) {
      await notify('warmup_step', `Прогрев ${acc.phone}: ${result.actions} действий, день ${acc.warmupDays}`, { accountId })
    }
  } catch (err) {
    logger.error({ accountId, err: err.message }, 'warmup_step ERROR')
    await notify('ban', `Ошибка прогрева аккаунта #${accountId}: ${err.message}`, { accountId })
  }
})

agenda.define('warmup_cycle', async () => {
  logger.info('Running warmup cycle')
  const { prisma } = await import('../src/lib/prisma.js')

  const accounts = await prisma.tgAccount.findMany({
    where: {
      status: 'WARMING',   // Только аккаунты явно переведённые в режим прогрева
      isWarmed: false,     // Пропускаем уже прогретые
      sessionData: { not: null },
    },
  })

  if (accounts.length === 0) {
    logger.info('warmup_cycle: нет аккаунтов на прогреве, пропускаем')
    return
  }

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
