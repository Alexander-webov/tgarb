/**
 * АНТИБАН СИСТЕМА — TGArb
 * На основе алгоритмов ведущих сервисов (TeleRaptor, Telethon-based tools, 2025)
 *
 * Ключевые принципы:
 * 1. Новые аккаунты = социальные действия ПЕРЕД рассылкой (7+ дней)
 * 2. Естественные задержки с джиттером (не равномерные интервалы)
 * 3. Множество шаблонов сообщений — ротация
 * 4. Лимиты зависят от возраста и прогрева аккаунта
 * 5. Автопауза при признаках бана
 * 6. SpamBot проверка каждые 3 дня
 */

import { prisma } from './prisma.js'

// ── Лимиты по возрасту аккаунта ──────────────────────────
export function getDailyLimit(account) {
  const ageDays = Math.floor((Date.now() - new Date(account.createdAt).getTime()) / 86400000)
  const warmupDays = account.warmupDays || 0

  // Новый аккаунт до прогрева
  if (!account.isWarmed || warmupDays < 3) return 0

  // Только что прогретый (1-3 дня после прогрева)
  if (warmupDays < 5) return 15

  // Молодой прогретый аккаунт
  if (ageDays < 30) return 20

  // Стандартный прогретый
  if (ageDays < 90) return 30

  // Старый надёжный аккаунт
  return Math.min(account.dailyLimit || 50, 50)
}

// ── Задержка между сообщениями с джиттером ───────────────
export function getDelay(account, messagesSentThisSession = 0) {
  const base = account.delayMin || 30

  // Чем больше отправлено за сессию — тем длиннее пауза (усталость)
  const fatigueFactor = 1 + (messagesSentThisSession / 10) * 0.3

  // Случайный джиттер ±40% — имитирует человека
  const jitter = base * 0.4 * (Math.random() * 2 - 1)

  // Случайные длинные паузы (10% времени) — человек отвлёкся
  const longBreak = Math.random() < 0.1 ? base * 3 : 0

  const delay = Math.max(15, (base * fatigueFactor) + jitter + longBreak)
  return Math.round(delay)
}

// ── Рандомизация текста сообщения ────────────────────────
export function randomizeMessage(template) {
  let text = template

  // {вариант1|вариант2|вариант3} — спинтакс
  const spinRegex = /\{([^}]+)\}/g
  text = text.replace(spinRegex, (_, variants) => {
    const options = variants.split('|')
    return options[Math.floor(Math.random() * options.length)]
  })

  // Случайные пробелы/переносы в конце (уникальный fingerprint)
  if (Math.random() < 0.3) text = text + ' '
  if (Math.random() < 0.2) text = '\u200b' + text  // zero-width space в начале

  return text
}

// ── Проверка здоровья аккаунта ───────────────────────────
export async function checkAccountHealth(accountId) {
  const acc = await prisma.tgAccount.findUnique({ where: { id: accountId } })
  if (!acc) return { healthy: false, reason: 'not_found' }

  const issues = []

  // Забанен
  if (acc.status === 'BANNED') return { healthy: false, reason: 'banned', banReason: acc.banReason }

  // Ограничен
  if (acc.status === 'LIMITED') return { healthy: false, reason: 'limited' }

  // Превышен дневной лимит
  const limit = getDailyLimit(acc)
  if (acc.sentToday >= limit) return { healthy: false, reason: 'daily_limit', sent: acc.sentToday, limit }

  // Не прогрет
  if (!acc.isWarmed) issues.push('not_warmed')

  // Нет прокси (риск)
  if (!acc.proxyId) issues.push('no_proxy')

  // Давно не проверяли SpamBot (более 3 дней)
  const lastCheck = acc.lastSpamCheck ? new Date(acc.lastSpamCheck) : null
  if (!lastCheck || (Date.now() - lastCheck.getTime()) > 3 * 86400000) {
    issues.push('spamcheck_needed')
  }

  return { healthy: true, issues, limit, sentToday: acc.sentToday }
}

// ── Антибан проверка перед каждой отправкой ──────────────
export async function preSendCheck(accountId, sessionMessageCount = 0) {
  const health = await checkAccountHealth(accountId)

  if (!health.healthy) return { allow: false, reason: health.reason }

  // Стоп если слишком много за сессию (риск обнаружения)
  if (sessionMessageCount > 0 && sessionMessageCount % 20 === 0) {
    // Каждые 20 сообщений — длинная пауза 5-10 минут
    const breakTime = 300 + Math.random() * 300
    return { allow: false, reason: 'session_break', breakSeconds: Math.round(breakTime) }
  }

  return { allow: true, delay: getDelay(await prisma.tgAccount.findUnique({ where: { id: accountId } }), sessionMessageCount) }
}

// ── Реакция на ошибки отправки ───────────────────────────
export async function handleSendError(accountId, error) {
  const msg = error?.message || ''

  if (msg.includes('FLOOD_WAIT_')) {
    const seconds = parseInt(msg.match(/FLOOD_WAIT_(\d+)/)?.[1] || '300')
    // Обновляем статус и логируем
    await prisma.tgAccount.update({
      where: { id: accountId },
      data: { status: 'LIMITED', banReason: `FloodWait ${seconds}s` }
    })
    return { action: 'switch_account', waitSeconds: seconds }
  }

  if (msg.includes('PEER_FLOOD')) {
    await prisma.tgAccount.update({
      where: { id: accountId },
      data: { status: 'LIMITED', banReason: 'PeerFlood — SpamBot ограничение' }
    })
    return { action: 'switch_account' }
  }

  if (msg.includes('USER_PRIVACY_RESTRICTED')) {
    return { action: 'skip' }  // Пользователь закрыл ЛС — тихо пропускаем
  }

  if (msg.includes('INPUT_USER_DEACTIVATED')) {
    return { action: 'skip' }  // Аккаунт удалён
  }

  if (msg.includes('AUTH_KEY') || msg.includes('SESSION_REVOKED') || msg.includes('USER_DEACTIVATED_BAN')) {
    await prisma.tgAccount.update({
      where: { id: accountId },
      data: { status: 'BANNED', banReason: msg.slice(0, 200) }
    })
    return { action: 'banned' }
  }

  return { action: 'retry' }
}

// ── Умный выбор следующего аккаунта ──────────────────────
export async function pickBestAccount(accountIds) {
  // Get all active accounts (warmed or not)
  const where = {
    status: 'ACTIVE',
    sessionData: { not: null },
  }
  // If specific account IDs provided, filter by them
  if (accountIds && accountIds.length > 0) {
    where.id = { in: accountIds }
  }

  const accounts = await prisma.tgAccount.findMany({
    where,
    orderBy: [
      { sentToday: 'asc' },   // Сначала те кто меньше отправил
      { warmupDays: 'desc' },  // Приоритет прогретым
      { isWarmed: 'desc' },
    ]
  })

  // Filter by effective daily limit
  const available = accounts.filter(a => {
    const limit = getEffectiveDailyLimit(a)
    return a.sentToday < limit
  })

  if (!available.length) return null
  return available[0]
}

// Effective limit - for unwarmed accounts use a conservative limit
export function getEffectiveDailyLimit(account) {
  const strict = getDailyLimit(account)
  if (strict > 0) return strict
  // Account exists and is ACTIVE but not warmed - allow small limit
  if (account.status === 'ACTIVE') return account.dailyLimit || 30
  return 0
}

// ── Статус здоровья всех аккаунтов ───────────────────────
export async function getAccountsHealthReport() {
  const accounts = await prisma.tgAccount.findMany({
    where: { sessionData: { not: null } }
  })

  return accounts.map(acc => {
    const limit = getDailyLimit(acc)
    const pct = limit > 0 ? Math.round((acc.sentToday / limit) * 100) : 0
    const riskLevel = getRiskLevel(acc)
    return {
      id: acc.id,
      phone: acc.phone,
      status: acc.status,
      isWarmed: acc.isWarmed,
      warmupDays: acc.warmupDays,
      sentToday: acc.sentToday,
      limit,
      pct,
      riskLevel,
      hasProxy: !!acc.proxyId,
      geo: acc.geo,
    }
  })
}

function getRiskLevel(acc) {
  if (acc.status === 'BANNED') return 'banned'
  if (acc.status === 'LIMITED') return 'high'
  if (!acc.isWarmed) return 'high'
  if (!acc.proxyId) return 'medium'
  if (acc.warmupDays < 5) return 'medium'
  return 'low'
}
