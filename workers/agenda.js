// workers/agenda.js
// Agenda — простой планировщик задач на MongoDB
// Запуск: node workers/agenda.js

import Agenda from 'agenda'
import cron from 'node-cron'
import pino from 'pino'

const logger = pino({ name: 'agenda' })

async function notify(type, message, data = {}) {
  try {
    const { prisma } = await import('../src/lib/prisma.js')
    await prisma.notification.create({ data: { type, message, data } })
  } catch (e) {
    logger.error({ err: e.message }, 'Failed to create notification')
  }
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
  const { accountPool, sender } = await import('../src/lib/telegram/client.js')
  const { wsManager } = await import('../src/lib/ws.js')

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { accounts: { include: { account: true } } },
  })

  if (!campaign || campaign.status !== 'RUNNING') return

  // Get already sent recipients to avoid duplicates
  const alreadySent = await prisma.sentMessage.findMany({
    where: { campaignId },
    select: { recipientId: true },
  })
  const sentIds = new Set(alreadySent.map(s => s.recipientId.toString()))

  const recipients = await prisma.parsedUser.findMany({
    where: { channel: { username: { in: campaign.targetChannels } } },
    take: (campaign.maxRecipients || 10000) + alreadySent.length,
  })

  // Filter out already sent
  const pending = recipients.filter(u => !sentIds.has(u.tgUserId.toString()))

  if (pending.length === 0) {
    await prisma.campaign.update({ where: { id: campaignId }, data: { status: 'DONE' } })
    await notify('campaign_done', `Рассылка «${campaign.name}» завершена — все получатели охвачены`, { campaignId })
    return
  }

  // Get active accounts - use campaign accounts or all active
  let accounts = campaign.accounts.map(a => a.account).filter(a => a.status === 'ACTIVE')
  if (accounts.length === 0) {
    // Fall back to all active accounts
    accounts = await prisma.tgAccount.findMany({ where: { status: 'ACTIVE', sessionData: { not: null } } })
  }
  if (accounts.length === 0) {
    await prisma.campaign.update({ where: { id: campaignId }, data: { status: 'PAUSED' } })
    await notify('info', `Рассылка «${campaign.name}» приостановлена — нет активных аккаунтов`, { campaignId })
    return
  }

  let sent = campaign.sentCount || 0
  let failed = campaign.failedCount || 0
  let accIdx = 0
  let consecutiveFails = 0

  for (const user of pending) {
    // Re-check campaign status (could be paused externally)
    const currentCampaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { status: true } })
    if (!currentCampaign || currentCampaign.status !== 'RUNNING') {
      logger.info({ campaignId }, 'Campaign stopped externally')
      break
    }

    // Smart account rotation - find next available account
    let account = null
    let attempts = 0
    while (attempts < accounts.length) {
      const candidate = accounts[accIdx % accounts.length]
      // Refresh account status from DB
      const fresh = await prisma.tgAccount.findUnique({ where: { id: candidate.id } })
      if (fresh && fresh.status === 'ACTIVE' && fresh.sentToday < fresh.dailyLimit) {
        account = fresh
        break
      }
      accIdx++
      attempts++
    }

    if (!account) {
      logger.warn({ campaignId }, 'All accounts at daily limit or inactive — stopping')
      await prisma.campaign.update({ where: { id: campaignId }, data: { status: 'PAUSED', sentCount: sent, failedCount: failed } })
      await notify('info', `Рассылка «${campaign.name}» приостановлена — все аккаунты достигли дневного лимита. Продолжится завтра.`, { campaignId })
      break
    }

    // Random delay between messages (use campaign setting + jitter)
    const baseDelay = campaign.delayBetween || 30
    const jitter = Math.random() * 15 - 7  // ±7 seconds
    const delay = Math.max(10, baseDelay + jitter)
    await new Promise(r => setTimeout(r, delay * 1000))

    // Send message
    const result = await sender.sendDM(account.id, user.tgUserId, campaign.messageText)

    if (result.ok) {
      sent++
      consecutiveFails = 0
      await prisma.tgAccount.update({ where: { id: account.id }, data: { sentToday: { increment: 1 } } })
      await prisma.sentMessage.create({
        data: { campaignId, accountId: account.id, recipientId: user.tgUserId, isDelivered: true },
      })
      // Broadcast live progress
      wsManager.broadcast('campaign_progress', {
        campaignId, sent, failed,
        status: 'sent',
        message: `✅ Отправлено ${sent} сообщений (аккаунт ${account.phone})`
      }).catch(() => {})
    } else {
      failed++
      consecutiveFails++
      await prisma.sentMessage.create({
        data: { campaignId, accountId: account.id, recipientId: user.tgUserId, isDelivered: false, error: result.error || 'unknown' },
      })

      if (result.peerFlood) {
        // PeerFlood = account is spammy, rotate immediately
        await prisma.tgAccount.update({ where: { id: account.id }, data: { status: 'LIMITED' } })
        await notify('limited', `Аккаунт ${account.phone} получил PeerFlood во время рассылки «${campaign.name}». Переключаем.`, { campaignId, accountId: account.id })
        accIdx++
      } else if (result.floodWait) {
        // FloodWait = rotate account, don't wait
        await notify('limited', `Аккаунт ${account.phone}: FloodWait ${result.floodWait}с. Переключаем на следующий.`, { campaignId })
        accIdx++
      } else if (result.userPrivacy) {
        // User has privacy settings - skip silently, not an error
        failed--
        await prisma.sentMessage.deleteMany({ where: { campaignId, recipientId: user.tgUserId } })
      }

      // Stop if too many consecutive failures
      if (consecutiveFails >= 5) {
        await prisma.campaign.update({ where: { id: campaignId }, data: { status: 'PAUSED', sentCount: sent, failedCount: failed } })
        await notify('info', `Рассылка «${campaign.name}» приостановлена — 5 ошибок подряд. Проверь аккаунты.`, { campaignId })
        break
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
  await notify('campaign_done', `Рассылка #${campaignId} завершена: отправлено ${sent}, ошибок ${failed}`, { campaignId, sent, failed })
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
    const { smartWarmupStep } = await import('../src/lib/telegram/warmup.js')
    const result = await smartWarmupStep(accountId)
    logger.info({ accountId, ...result }, 'warmup_step DONE')
  if (result.status === 'banned') {
    await notify('ban', `Аккаунт #${accountId} забанен во время прогрева`, { accountId })
  } else if (result.status === 'limited') {
    await notify('limited', `Аккаунт #${accountId} ограничен SpamBot`, { accountId })
  } else if (result.actions > 0) {
    await notify('warmup_step', `Прогрев аккаунта #${accountId}: ${result.actions} действий, день ${result.day || 0}`, { accountId, ...result })
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
      status: { in: ['WARMING', 'ACTIVE', 'OFFLINE'] },
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
// ── Инвайтер ─────────────────────────────────────────────
agenda.define('run_inviter', async (job) => {
  const { taskId } = job.attrs.data
  const { prisma } = await import('../src/lib/prisma.js')
  const { accountPool } = await import('../src/lib/telegram/client.js')
  const { Api } = await import('telegram/tl/index.js')

  const task = await prisma.inviteTask.findUnique({ where: { id: taskId } })
  if (!task || task.status !== 'RUNNING') return

  logger.info({ taskId, chat: task.targetChat }, 'Inviter started')

  // Get users to invite from parsed DB
  const users = await prisma.parsedUser.findMany({ take: task.limitPerAcc * task.accountIds.length })

  let invited = 0, failed = 0
  let userIdx = 0

  for (const accId of task.accountIds) {
    const client = await accountPool.getClient(accId)
    if (!client) continue

    let accInvited = 0
    while (accInvited < task.limitPerAcc && userIdx < users.length) {
      const user = users[userIdx++]
      try {
        const entity = await client.getEntity(task.targetChat)
        await client.invoke(new Api.channels.InviteToChannel({
          channel: entity,
          users: [user.tgUserId],
        }))
        invited++
        accInvited++
        await new Promise(r => setTimeout(r, task.delaySeconds * 1000))
      } catch (err) {
        failed++
        if (err.message?.includes('FLOOD')) break
      }
    }
    await prisma.inviteTask.update({ where: { id: taskId }, data: { invited, failed } })
  }

  await prisma.inviteTask.update({ where: { id: taskId }, data: { status: 'DONE', invited, failed } })
  await notify('info', `Инвайтер завершён: приглашено ${invited}, ошибок ${failed}`, { taskId })
  logger.info({ taskId, invited, failed }, 'Inviter done')
})

// ── Масслайкинг/масслукинг сторис ────────────────────────
agenda.define('run_stories', async (job) => {
  const { taskId } = job.attrs.data
  const { prisma } = await import('../src/lib/prisma.js')
  const { accountPool } = await import('../src/lib/telegram/client.js')
  const { Api } = await import('telegram/tl/index.js')

  const task = await prisma.storiesTask.findUnique({ where: { id: taskId } })
  if (!task || task.status !== 'RUNNING') return

  logger.info({ taskId }, 'Stories task started')

  let viewed = 0, liked = 0

  // Get target users from parsed DB if no explicit list
  let targets = task.targetUsers
  if (!targets.length) {
    const parsed = await prisma.parsedUser.findMany({
      where: { username: { not: null } },
      take: task.limitPerAcc * task.accountIds.length,
      select: { username: true }
    })
    targets = parsed.map(u => u.username).filter(Boolean)
  }

  for (const accId of task.accountIds) {
    const client = await accountPool.getClient(accId)
    if (!client) continue

    let accCount = 0
    for (const username of targets) {
      if (accCount >= task.limitPerAcc) break
      try {
        const peer = await client.getEntity(username)
        const stories = await client.invoke(new Api.stories.GetPeerStories({ peer }))
        for (const story of (stories.stories?.stories || [])) {
          if (task.mode === 'view' || task.mode === 'both') {
            await client.invoke(new Api.stories.IncrementStoryViews({
              peer, id: [story.id]
            }))
            viewed++
          }
          if ((task.mode === 'like' || task.mode === 'both') && story.id) {
            await client.invoke(new Api.stories.SendReaction({
              peer, storyId: story.id,
              reaction: new Api.ReactionEmoji({ emoticon: '❤️' })
            }))
            liked++
          }
        }
        accCount++
        await new Promise(r => setTimeout(r, 2000 + Math.random() * 3000))
      } catch { continue }
    }
    await prisma.storiesTask.update({ where: { id: taskId }, data: { viewed, liked } })
  }

  await prisma.storiesTask.update({ where: { id: taskId }, data: { status: 'DONE', viewed, liked } })
  await notify('info', `Масслайкинг завершён: просмотров ${viewed}, лайков ${liked}`, { taskId })
})

// ── Накрутка реакций/голосований ─────────────────────────
agenda.define('run_boost', async (job) => {
  const { taskId } = job.attrs.data
  const { prisma } = await import('../src/lib/prisma.js')
  const { accountPool } = await import('../src/lib/telegram/client.js')
  const { Api } = await import('telegram/tl/index.js')

  const task = await prisma.boostTask.findUnique({ where: { id: taskId } })
  if (!task) return

  let done = 0
  const perAcc = Math.ceil(task.count / Math.max(task.accountIds.length, 1))

  for (const accId of task.accountIds) {
    const client = await accountPool.getClient(accId)
    if (!client) continue
    try {
      const entity = await client.getEntity(task.target)
      if (task.type === 'reactions' && task.postId) {
        await client.invoke(new Api.messages.SendReaction({
          peer: entity,
          msgId: task.postId,
          reaction: [new Api.ReactionEmoji({ emoticon: task.emoji || '❤️' })],
        }))
        done++
      } else if (task.type === 'views' && task.postId) {
        await client.invoke(new Api.messages.GetMessagesViews({ peer: entity, id: [task.postId], increment: true }))
        done++
      }
      await new Promise(r => setTimeout(r, 1500 + Math.random() * 2000))
    } catch(e) { logger.error({ taskId, accId, err: e.message }, 'Boost error') }
  }

  await prisma.boostTask.update({ where: { id: taskId }, data: { status: 'DONE', done } })
  await notify('info', `Накрутка завершена: ${done} действий`, { taskId })
})

// ── Клонер ────────────────────────────────────────────────
agenda.define('run_cloner', async (job) => {
  const { sourceChat, targetChat, accountId, limit } = job.attrs.data
  const { accountPool } = await import('../src/lib/telegram/client.js')

  const client = await accountPool.getClient(accountId)
  if (!client) return

  try {
    const source = await client.getEntity(sourceChat)
    const target = await client.getEntity(targetChat)
    let cloned = 0

    for await (const msg of client.iterMessages(source, { limit })) {
      if (!msg.message && !msg.media) continue
      try {
        await client.sendMessage(target, { message: msg.message || '', file: msg.media || undefined })
        cloned++
        await new Promise(r => setTimeout(r, 2000 + Math.random() * 3000))
      } catch { continue }
    }
    await notify('info', `Клонирование завершено: ${cloned} сообщений из ${sourceChat} в ${targetChat}`, {})
  } catch(e) {
    logger.error({ sourceChat, targetChat, err: e.message }, 'Cloner error')
  }
})

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
