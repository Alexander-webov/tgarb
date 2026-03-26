// src/lib/notifications.js
import { prisma } from './prisma.js'
import pino from 'pino'

const logger = pino({ name: 'notifications' })

// Send Telegram notification to admin
async function sendTelegramNotification(message) {
  const botToken  = process.env.BOT_TOKEN
  const adminChat = process.env.ADMIN_CHAT_ID // Admin's Telegram user ID

  if (!botToken || !adminChat) return false

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: adminChat,
        text: message,
        parse_mode: 'HTML',
      }),
    })
    return true
  } catch (err) {
    logger.error({ err: err.message }, 'Failed to send Telegram notification')
    return false
  }
}

// Create notification + send to Telegram
export async function notify(type, message, data = null) {
  try {
    // Save to DB
    await prisma.notification.create({
      data: { type, message, data: data || undefined },
    })

    // Send to Telegram
    const icons = {
      conversion:     '💰',
      ban:            '🚫',
      campaign_done:  '✅',
      flood_wait:     '⚠️',
      warmup_done:    '🔥',
      error:          '❌',
    }
    const icon = icons[type] || 'ℹ️'
    const sent = await sendTelegramNotification(`${icon} <b>TGArb</b>\n${message}`)

    if (sent) {
      await prisma.notification.updateMany({
        where: { type, message },
        data: { sentToTg: true },
      })
    }

    // Also broadcast via WebSocket
    const { wsManager } = await import('./ws.js')
    wsManager.broadcast('notification', { type, message, data })

  } catch (err) {
    logger.error({ err: err.message }, 'Notify error')
  }
}

// Shortcut helpers
export const notifyConversion = (slug, payout) =>
  notify('conversion', `Новая конверсия!\nСлаг: <code>${slug}</code>\nВыплата: <b>$${payout}</b>`)

export const notifyBan = (phone, replacement) =>
  notify('ban', `Аккаунт <b>${phone}</b> забанен\n${replacement ? `Заменён на: ${replacement}` : 'Замены нет!'}`)

export const notifyCampaignDone = (name, sent, leads) =>
  notify('campaign_done', `Кампания <b>${name}</b> завершена\nОтправлено: ${sent}\nЛидов: ${leads}`)

export const notifyFloodWait = (phone, seconds) =>
  notify('flood_wait', `Аккаунт <b>${phone}</b> получил FloodWait ${seconds} сек`)

export const notifyWarmupDone = (phone) =>
  notify('warmup_done', `Аккаунт <b>${phone}</b> прогрет и готов к работе! 🔥`)
