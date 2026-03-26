// bot/index.js
import { Bot, session, InlineKeyboard } from 'grammy'
import { PrismaClient } from '@prisma/client'
import pino from 'pino'

const logger = pino({ name: 'bot' })
const prisma = new PrismaClient()
const bot    = new Bot(process.env.BOT_TOKEN || '')

// ── Session ───────────────────────────────────────────────
bot.use(session({
  initial: () => ({ funnelId: null, step: 0, answers: {} }),
}))

// ══════════════════════════════════════════════════════════
//  COMMANDS
// ══════════════════════════════════════════════════════════

bot.command('start', async (ctx) => {
  // Find active funnel
  const funnel = await prisma.funnel.findFirst({ where: { isActive: true } })
  if (!funnel || !funnel.steps?.length) {
    return ctx.reply('👋 Привет! Напиши /help чтобы узнать больше.')
  }

  // Create/reset session
  await prisma.funnelSession.upsert({
    where: { funnelId_userId: { funnelId: funnel.id, userId: BigInt(ctx.from.id) } },
    create: { funnelId: funnel.id, userId: BigInt(ctx.from.id), step: 0 },
    update: { step: 0, isDone: false },
  })
  await prisma.funnel.update({ where: { id: funnel.id }, data: { totalStarts: { increment: 1 } } })

  ctx.session.funnelId = funnel.id
  ctx.session.step     = 0
  ctx.session.answers  = {}

  await sendStep(ctx, funnel, 0)
})

bot.command('stats', async (ctx) => {
  const [accounts, channels, campaigns] = await Promise.all([
    prisma.tgAccount.count({ where: { status: 'ACTIVE' } }),
    prisma.channel.count(),
    prisma.campaign.count({ where: { status: 'RUNNING' } }),
  ])
  const revenue = await prisma.conversion.aggregate({ _sum: { payout: true } })

  await ctx.reply(
    `📊 *Статистика TGArb*\n\n` +
    `👤 Активных аккаунтов: *${accounts}*\n` +
    `📡 Каналов: *${channels}*\n` +
    `🚀 Активных рассылок: *${campaigns}*\n` +
    `💰 Выручка всего: *$${(revenue._sum.payout || 0).toFixed(2)}*`,
    { parse_mode: 'Markdown' }
  )
})

bot.command('help', async (ctx) => {
  await ctx.reply(
    '📋 *Команды:*\n\n' +
    '/start — запустить воронку\n' +
    '/stats — статистика\n' +
    '/help — эта справка',
    { parse_mode: 'Markdown' }
  )
})

// ══════════════════════════════════════════════════════════
//  CALLBACK QUERIES (кнопки воронки)
// ══════════════════════════════════════════════════════════

bot.on('callback_query:data', async (ctx) => {
  await ctx.answerCallbackQuery()

  const funnelId = ctx.session.funnelId
  if (!funnelId) return

  const funnel = await prisma.funnel.findUnique({ where: { id: funnelId } })
  if (!funnel) return

  const steps = funnel.steps
  const step  = ctx.session.step

  // Save answer
  ctx.session.answers[`step_${step}`] = ctx.callbackQuery.data

  // Update session in DB
  await prisma.funnelSession.updateMany({
    where: { funnelId, userId: BigInt(ctx.from.id) },
    data:  { step: step + 1, data: ctx.session.answers },
  })

  ctx.session.step = step + 1

  // Next step or done
  if (ctx.session.step < steps.length) {
    await sendStep(ctx, funnel, ctx.session.step)
  } else {
    await finishFunnel(ctx, funnel)
  }
})

// ── Text answers ──────────────────────────────────────────
bot.on('message:text', async (ctx) => {
  if (ctx.message.text.startsWith('/')) return
  const funnelId = ctx.session.funnelId
  if (!funnelId) return

  const funnel = await prisma.funnel.findUnique({ where: { id: funnelId } })
  if (!funnel) return

  const step = ctx.session.step
  ctx.session.answers[`step_${step}`] = ctx.message.text

  await prisma.funnelSession.updateMany({
    where: { funnelId, userId: BigInt(ctx.from.id) },
    data:  { step: step + 1, data: ctx.session.answers },
  })
  ctx.session.step++

  if (ctx.session.step < funnel.steps.length) {
    await sendStep(ctx, funnel, ctx.session.step)
  } else {
    await finishFunnel(ctx, funnel)
  }
})

// ══════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════

async function sendStep(ctx, funnel, stepIdx) {
  const step = funnel.steps[stepIdx]
  if (!step) return

  // Delay
  if (step.delay > 0) {
    await new Promise(r => setTimeout(r, step.delay * 1000))
  }

  if (step.type === 'message') {
    await ctx.reply(step.text)

  } else if (step.type === 'question') {
    const kb = new InlineKeyboard()
    for (const opt of (step.options || [])) {
      kb.text(opt, opt).row()
    }
    await ctx.reply(step.text, { reply_markup: kb })

  } else if (step.type === 'redirect') {
    const kb = new InlineKeyboard()
    kb.url(step.text || '👉 Перейти', step.url || funnel.offerUrl || '#')
    await ctx.reply('🎯 Твой персональный оффер готов!', { reply_markup: kb })
  }
}

async function finishFunnel(ctx, funnel) {
  await prisma.funnelSession.updateMany({
    where: { funnelId: funnel.id, userId: BigInt(ctx.from.id) },
    data:  { isDone: true },
  })
  await prisma.funnel.update({
    where: { id: funnel.id },
    data:  { totalDone: { increment: 1 } },
  })

  if (funnel.offerUrl) {
    const kb = new InlineKeyboard().url('🚀 Получить оффер', funnel.offerUrl)
    await ctx.reply(
      '✅ Отлично! Мы подобрали лучший оффер специально для тебя.',
      { reply_markup: kb }
    )
  } else {
    await ctx.reply('✅ Спасибо! Скоро с тобой свяжутся.')
  }

  ctx.session.funnelId = null
  ctx.session.step     = 0
  ctx.session.answers  = {}
}

// ══════════════════════════════════════════════════════════
//  START
// ══════════════════════════════════════════════════════════

bot.catch(err => logger.error({ err: err.message }, 'Bot error'))

bot.start({
  onStart: () => logger.info('Bot started'),
})

process.on('SIGTERM', () => bot.stop())
process.on('SIGINT',  () => bot.stop())
