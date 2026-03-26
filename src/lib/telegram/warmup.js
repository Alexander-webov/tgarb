// src/lib/telegram/warmup.js
import { accountPool } from './client.js'
import { prisma } from '../prisma.js'
import { wsManager } from '../ws.js'
import pino from 'pino'

const logger = pino({ name: 'warmup' })

const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

// ── Niche channel dict ────────────────────────────────────
export const NICHE_CHANNELS = {
  crypto:    ['bitcoin', 'ethereum', 'binance_russian', 'cryptonewsru', 'coindesk', 'whalewatch'],
  gambling:  ['casino_ru_news', 'stavki_online', 'betinside_ru', 'casinoguru_ru'],
  arbitrage: ['arbmania', 'traffic_arb', 'cpa_network_ru', 'affiliate_marketing_ru'],
  finance:   ['rbc_economics', 'investing_ru', 'tinkoff_invest', 'banki_ru'],
  nutra:     ['zdorovye_ru', 'nutrition_club_ru', 'fitnessmarathon_ru'],
  general:   ['durov', 'telegram', 'tginfo', 'breakingmash', 'rbc_news'],
}

// Warmup plan by day
const PLAN = {
  0: { reads: [5, 10],  reactions: 0, chats: false, subs: 3 },
  1: { reads: [8, 15],  reactions: [1, 3], chats: false, subs: 2 },
  2: { reads: [10, 20], reactions: [2, 5], chats: false, subs: 2 },
  3: { reads: [10, 15], reactions: [3, 6], chats: true,  subs: 1 },
  4: { reads: [8, 12],  reactions: [2, 4], chats: true,  subs: 1 },
}

// ── Ban detection ─────────────────────────────────────────
export async function checkBanStatus(client, phone) {
  try {
    const result = { isBanned: false, isLimited: false, details: 'OK' }

    await client.sendMessage('SpamBot', { message: '/start' })
    await sleep(3000)

    const msgs = await client.getMessages('SpamBot', { limit: 1 })
    if (msgs?.[0]?.message) {
      const text = msgs[0].message.toLowerCase()
      if (text.includes('limited') || text.includes('spam')) {
        result.isLimited = true
        result.details = 'SpamBot: account limited'
      } else if (text.includes('free') || text.includes('no limits')) {
        result.details = 'SpamBot: OK'
      }
    }
    return result
  } catch (err) {
    if (err.message?.includes('AUTH_KEY_UNREGISTERED') ||
        err.message?.includes('USER_DEACTIVATED')) {
      return { isBanned: true, isLimited: false, details: 'Account deactivated' }
    }
    return { isBanned: false, isLimited: false, details: err.message }
  }
}

// ── Auto-replace banned account ───────────────────────────
export async function autoReplaceBanned(bannedAccountId) {
  await prisma.tgAccount.update({
    where: { id: bannedAccountId },
    data: { status: 'BANNED' },
  })

  const banned = await prisma.tgAccount.findUnique({ where: { id: bannedAccountId } })
  logger.warn({ phone: banned?.phone }, 'Account banned — finding replacement')

  const replacement = await prisma.tgAccount.findFirst({
    where: {
      status: 'ACTIVE',
      isWarmed: true,
      id: { not: bannedAccountId },
    },
    orderBy: { sentToday: 'asc' },
  })

  if (!replacement) {
    await wsManager.broadcast('system_alert', {
      level: 'error',
      message: `🚫 Аккаунт ${banned?.phone} забанен, замены нет!`,
    })
    return null
  }

  // Replace in running campaigns
  const runningCampaigns = await prisma.campaign.findMany({
    where: { status: 'RUNNING' },
    include: { accounts: true },
  })

  let replaced = 0
  for (const camp of runningCampaigns) {
    const hasAccount = camp.accounts.some(a => a.accountId === bannedAccountId)
    if (hasAccount) {
      await prisma.campaignAccount.delete({
        where: { campaignId_accountId: { campaignId: camp.id, accountId: bannedAccountId } },
      })
      await prisma.campaignAccount.upsert({
        where: { campaignId_accountId: { campaignId: camp.id, accountId: replacement.id } },
        create: { campaignId: camp.id, accountId: replacement.id },
        update: {},
      })
      replaced++
    }
  }

  await wsManager.broadcast('account_status', {
    accountId: bannedAccountId,
    phone: banned?.phone,
    status: 'banned',
    reason: `Заменён на ${replacement.phone} в ${replaced} кампаниях`,
  })
  await wsManager.broadcast('system_alert', {
    level: 'warning',
    message: `⚠️ ${banned?.phone} забанен → заменён на ${replacement.phone}`,
  })

  try { const { notifyBan } = await import('../notifications.js'); await notifyBan(banned?.phone, replacement.phone) } catch {}
  logger.info({ bannedPhone: banned?.phone, replacement: replacement.phone, replaced }, 'Account replaced')
  return replacement
}

// ── Smart warmup step ─────────────────────────────────────
export async function smartWarmupStep(accountId) {
  const acc = await prisma.tgAccount.findUnique({
    where: { id: accountId },
    include: { proxy: true },
  })
  if (!acc || acc.status === 'BANNED') return { actions: 0, status: 'skip' }

  const client = await accountPool.getClient(accountId)
  if (!client) return { actions: 0, status: 'no_client' }

  const day = acc.warmupDays
  const plan = PLAN[Math.min(day, 4)]
  let actions = 0

  try {
    // Ban check every 3 days
    if (day > 0 && day % 3 === 0) {
      const banStatus = await checkBanStatus(client, acc.phone)
      if (banStatus.isBanned) {
        await autoReplaceBanned(accountId)
        return { actions: 0, status: 'banned' }
      }
      if (banStatus.isLimited) {
        await prisma.tgAccount.update({ where: { id: accountId }, data: { status: 'LIMITED' } })
        await wsManager.broadcast('account_status', { accountId, phone: acc.phone, status: 'limited', reason: banStatus.details })
        return { actions: 0, status: 'limited' }
      }
    }

    // Auto-subscribe to niche channels
    if (plan.subs > 0) {
      const niche = acc.niche || 'general'
      const channels = NICHE_CHANNELS[niche] || NICHE_CHANNELS.general
      const toSub = channels.sort(() => Math.random() - 0.5).slice(0, plan.subs)
      for (const ch of toSub) {
        try {
          const entity = await client.getEntity(ch)
          await client.invoke(new (await import('telegram/tl/index.js')).Api.channels.JoinChannel({ channel: entity }))
          actions++
          await sleep(rand(8000, 25000))
        } catch { /* already joined or not found */ }
      }
    }

    // Read channels
    const [rMin, rMax] = plan.reads
    const readCount = rand(rMin, rMax)
    actions += await readChannels(client, acc.niche || 'general', readCount)

    // React
    if (plan.reactions) {
      const [reMin, reMax] = plan.reactions
      actions += await reactToRecent(client, acc.niche || 'general', rand(reMin, reMax))
    }

    // Update account
    const newDay = day + 1
    const newStatus = newDay >= 5 ? 'ACTIVE' : 'WARMING'
    const wasWarmed = acc.isWarmed

    await prisma.tgAccount.update({
      where: { id: accountId },
      data: {
        warmupDays: newDay,
        status: newStatus,
        isWarmed: newDay >= 5,
        lastActive: new Date(),
      },
    })

    await wsManager.broadcast('warmup_progress', {
      accountId,
      phone: acc.phone,
      day: newDay,
      actions,
      isReady: newDay >= 5,
    })

    if (newStatus === 'ACTIVE' && !wasWarmed) {
      await wsManager.broadcast('system_alert', {
        level: 'info',
        message: `✅ Аккаунт ${acc.phone} прогрет и готов к работе!`,
      })
    }

    if (newStatus === 'ACTIVE' && !acc.isWarmed) {
      try { const { notifyWarmupDone } = await import('../notifications.js'); await notifyWarmupDone(acc.phone) } catch {}
    }
    logger.info({ phone: acc.phone, day: newDay, actions, status: newStatus }, 'Warmup step done')
    return { actions, day: newDay, status: newStatus }

  } catch (err) {
    logger.error({ accountId, err: err.message }, 'Warmup step error')
    return { actions: 0, status: 'error', error: err.message }
  }
}

async function readChannels(client, niche, count) {
  const channels = NICHE_CHANNELS[niche] || NICHE_CHANNELS.general
  const selected = channels.sort(() => Math.random() - 0.5).slice(0, Math.min(3, channels.length))
  let actions = 0
  for (const ch of selected) {
    try {
      const limit = rand(5, 15)
      for await (const msg of client.iterMessages(ch, { limit })) {
        const textLen = (msg.message || '').length
        const readTime = Math.max(500, Math.min(textLen / 800 * 1000 + rand(-300, 500), 8000))
        await sleep(readTime)
        actions++
      }
      await sleep(rand(10000, 40000))
    } catch { /* channel not accessible */ }
  }
  return actions
}

async function reactToRecent(client, niche, count) {
  const { Api } = await import('telegram/tl/index.js')
  const REACTIONS = ['👍', '❤️', '🔥', '👏', '😮', '🤔']
  const channels = NICHE_CHANNELS[niche] || NICHE_CHANNELS.general
  let actions = 0
  const selected = channels.sort(() => Math.random() - 0.5).slice(0, count)
  for (const ch of selected) {
    try {
      const msgs = await client.getMessages(ch, { limit: 10 })
      const now = Date.now()
      const recent = msgs.filter(m => m.date && (now - m.date * 1000) < 86400000)
      if (!recent.length) continue
      const msg = recent[rand(0, recent.length - 1)]
      const reaction = REACTIONS[rand(0, REACTIONS.length - 1)]
      await client.invoke(new Api.messages.SendReaction({
        peer: ch, msgId: msg.id,
        reaction: [new Api.ReactionEmoji({ emoticon: reaction })],
      }))
      actions++
      await sleep(rand(5000, 20000))
    } catch { /* ignore */ }
  }
  return actions
}
