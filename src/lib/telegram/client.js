// src/lib/telegram/client.js
import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions/index.js'
import { Api } from 'telegram/tl/index.js'
// socks proxy handled via gram.js built-in support
import { prisma } from '../prisma.js'
import { env } from '../env.js'
import pino from 'pino'

const logger = pino({ name: 'telegram' })

// ══════════════════════════════════════════════════════════
//  ACCOUNT POOL
// ══════════════════════════════════════════════════════════

class AccountPool {
  constructor() {
    this._clients = new Map()   // accountId → TelegramClient
  }

  async getClient(accountId) {
    if (this._clients.has(accountId)) {
      const client = this._clients.get(accountId)
      if (client.connected) return client
    }
    return this._connect(accountId)
  }

  async _connect(accountId) {
    const acc = await prisma.tgAccount.findUnique({
      where: { id: accountId },
      include: { proxy: true },
    })
    if (!acc?.sessionData) {
      logger.warn({ accountId }, 'No session data')
      return null
    }

    try {
      const session = new StringSession(acc.sessionData)
      const clientOptions = {
        connectionRetries: 3,
        retryDelay: 1000,
        autoReconnect: true,
        deviceModel: 'Samsung Galaxy S23',
        systemVersion: 'Android 13',
        appVersion: '1.0.0',
        langCode: 'ru',
      }

      // SOCKS5 proxy
      if (acc.proxy?.isActive) {
        clientOptions.socks = await this._socksSocket(acc.proxy)
      }

      const client = new TelegramClient(session, env.TG_API_ID, env.TG_API_HASH, clientOptions)
      await client.connect()

      this._clients.set(accountId, client)

      // Update status
      await prisma.tgAccount.update({
        where: { id: accountId },
        data: { status: 'ACTIVE', lastActive: new Date() },
      })

      logger.info({ accountId, phone: acc.phone }, 'Client connected')
      return client
    } catch (err) {
      logger.error({ accountId, err: err.message }, 'Connection failed')

      if (err.message?.includes('AUTH_KEY_UNREGISTERED') ||
          err.message?.includes('SESSION_REVOKED') ||
          err.message?.includes('USER_DEACTIVATED')) {
        await prisma.tgAccount.update({
          where: { id: accountId },
          data: { status: 'BANNED', banReason: err.message },
        })
      }
      return null
    }
  }

  async _socksSocket(proxy) {
    return {
      socksType: 5,
      host: proxy.host,
      port: proxy.port,
      userId: proxy.username || undefined,
      password: proxy.password || undefined,
    }
  }

  async disconnect(accountId) {
    const client = this._clients.get(accountId)
    if (client) {
      await client.disconnect()
      this._clients.delete(accountId)
    }
  }

  async disconnectAll() {
    for (const [id, client] of this._clients) {
      await client.disconnect().catch(() => {})
    }
    this._clients.clear()
  }

  getActiveCount() {
    return [...this._clients.values()].filter(c => c.connected).length
  }
}

export const accountPool = new AccountPool()

// ══════════════════════════════════════════════════════════
//  SENDER
// ══════════════════════════════════════════════════════════

export class TelegramSender {

  async sendDM(accountId, userId, text) {
    const client = await accountPool.getClient(accountId)
    if (!client) return { ok: false, error: 'no_client' }

    try {
      await client.sendMessage(userId, { message: text })
      return { ok: true }
    } catch (err) {
      const msg = err.message || ''
      if (msg.includes('FLOOD_WAIT_')) {
        const seconds = parseInt(msg.match(/FLOOD_WAIT_(\d+)/)?.[1] || '60')
        return { ok: false, floodWait: seconds }
      }
      if (msg.includes('PEER_FLOOD')) return { ok: false, peerFlood: true, error: msg }
      if (msg.includes('USER_PRIVACY_RESTRICTED') || msg.includes('privacy')) return { ok: false, userPrivacy: true }
      if (msg.includes('USER_BANNED_IN_CHANNEL')) return { ok: false, error: 'banned_in_channel' }
      if (msg.includes('INPUT_USER_DEACTIVATED')) return { ok: false, error: 'user_deactivated' }
      if (msg.includes('AUTH_KEY') || msg.includes('SESSION_REVOKED')) {
        await prisma.tgAccount.update({ where: { id: accountId }, data: { status: 'BANNED', banReason: msg } })
        return { ok: false, error: 'account_banned', ban: true }
      }
      if (msg.includes('FLOOD_WAIT_')) {
        const seconds = parseInt(msg.match(/FLOOD_WAIT_(\d+)/)?.[1] || '60')
        return { ok: false, floodWait: seconds }
      }
      if (err.message?.includes('PEER_FLOOD')) {
        return { ok: false, peerFlood: true }
      }
      return { ok: false, error: err.message }
    }
  }

  async getEntity(accountId, username) {
    const client = await accountPool.getClient(accountId)
    if (!client) return null
    try {
      return await client.getEntity(username)
    } catch {
      return null
    }
  }
}

export const sender = new TelegramSender()

// ══════════════════════════════════════════════════════════
//  PARSER
// ══════════════════════════════════════════════════════════

export class TelegramParser {

  async parseChannelInfo(accountId, username) {
    const client = await accountPool.getClient(accountId)
    if (!client) return null

    try {
      const entity = await client.getEntity(username.replace('@', ''))
      const fullChannel = await client.invoke(
        new Api.channels.GetFullChannel({ channel: entity })
      )
      const subscribers = fullChannel.fullChat.participantsCount || 0
      const about = fullChannel.fullChat.about || ''

      // Parse recent posts for metrics
      const posts = []
      for await (const msg of client.iterMessages(entity, { limit: 30 })) {
        if (msg.message) {
          posts.push({
            tgMsgId: msg.id,
            text: msg.message,
            views: msg.views || 0,
            reactions: msg.reactions?.results?.reduce((s, r) => s + r.count, 0) || 0,
            forwards: msg.forwards || 0,
            postedAt: new Date(msg.date * 1000),
          })
        }
      }

      const avgViews = posts.length
        ? Math.round(posts.reduce((s, p) => s + p.views, 0) / posts.length)
        : 0
      const erPercent = subscribers > 0
        ? parseFloat((avgViews / subscribers * 100).toFixed(2))
        : 0

      // Posts per day
      let postsPerDay = 0
      if (posts.length >= 2) {
        const oldest = posts[posts.length - 1].postedAt
        const newest = posts[0].postedAt
        const days = Math.max(1, (newest - oldest) / (1000 * 60 * 60 * 24))
        postsPerDay = parseFloat((posts.length / days).toFixed(1))
      }

      return {
        tgId: BigInt(entity.id),
        title: entity.title,
        username: entity.username,
        description: about,
        subscribers,
        avgViews,
        erPercent,
        postsPerDay,
        posts,
      }
    } catch (err) {
      logger.error({ username, err: err.message }, 'Parse channel error')
      throw err  // Re-throw so caller gets the real error
      return null
    }
  }

  async parseMembers(accountId, channelUsername, limit = 5000) {
    const client = await accountPool.getClient(accountId)
    if (!client) return []

    const channel = await prisma.channel.findUnique({
      where: { username: channelUsername.replace('@', '') },
    })
    if (!channel) return []

    const members = []
    try {
      const entity = await client.getEntity(channelUsername.replace('@', ''))

      const isBroadcast = entity.broadcast === true

      if (isBroadcast) {
        // Broadcast channel - parse commenters from posts instead
        logger.info({ channelUsername }, 'Broadcast channel - parsing commenters from posts')

        const { Api } = await import('telegram/tl/index.js')

        // Get recent posts
        let postCount = 0
        for await (const msg of client.iterMessages(entity, { limit: 100 })) {
          if (!msg.id) continue
          try {
            // Get comments for this post
            const replies = await client.invoke(new Api.messages.GetReplies({
              peer: entity,
              msgId: msg.id,
              offsetId: 0,
              offsetDate: 0,
              addOffset: 0,
              limit: 100,
              maxId: 0,
              minId: 0,
              hash: BigInt(0),
            }))

            for (const user of (replies.users || [])) {
              if (!user.bot && user.id && !user.deleted) {
                members.push({
                  channelId: channel.id,
                  tgUserId: BigInt(user.id),
                  username: user.username || null,
                  firstName: user.firstName || null,
                  lastName: user.lastName || null,
                  isBot: false,
                })
              }
            }
            postCount++
            if (members.length >= limit) break
          } catch {
            // Post has no comments or comments disabled
            continue
          }
        }

        // Deduplicate by tgUserId
        const seen = new Set()
        const unique = members.filter(m => {
          const key = m.tgUserId.toString()
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
        members.length = 0
        members.push(...unique)

        logger.info({ channelUsername, posts: postCount, commenters: members.length }, 'Commenters parsed')
      } else {

      for await (const user of client.iterParticipants(entity, { limit })) {
        if (!user.bot && user.id) {
          // Determine last online
          let lastOnline = null
          if (user.status?.className === 'UserStatusOnline') lastOnline = new Date()
          else if (user.status?.wasOnline) lastOnline = new Date(user.status.wasOnline * 1000)

          members.push({
            channelId: channel.id,
            tgUserId: BigInt(user.id),
            username: user.username || null,
            firstName: user.firstName || null,
            lastName: user.lastName || null,
            isBot: false,
            hasAvatar: !!(user.photo),
            lastOnline,
            sex: user.fake ? 0 : null,
          })
        }
      }

      } // end else (non-broadcast)

      // Upsert batch
      if (members.length > 0) {
        await prisma.$transaction(
          members.map(m => prisma.parsedUser.upsert({
            where: { channelId_tgUserId: { channelId: m.channelId, tgUserId: m.tgUserId } },
            create: m,
            update: {},
          }))
        )
      }

      logger.info({ channelUsername, count: members.length }, 'Members parsed')
    } catch (err) {
      logger.error({ channelUsername, err: err.message }, 'Parse members error')
    }

    return members
  }

  async searchChannels(accountId, query, limit = 20) {
    const client = await accountPool.getClient(accountId)
    if (!client) return []

    try {
      const result = await client.invoke(
        new Api.contacts.Search({ q: query, limit })
      )
      return result.chats
        .filter(c => c.className === 'Channel')
        .map(c => ({
          username: c.username || '',
          title: c.title || '',
          tgId: Number(c.id),
          subscribers: c.participantsCount || null,
          isBroadcast: c.broadcast || false,
        }))
    } catch (err) {
      logger.error({ query, err: err.message }, 'Search error')
      return []
    }
  }
}

export const parser = new TelegramParser()
