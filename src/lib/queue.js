// src/lib/queue.js
import { Queue, Worker, QueueEvents } from 'bullmq'
import IORedis from 'ioredis'
import { env } from './env.js'

// Shared Redis connection
export const redis = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
})

const connection = redis

// ── Queues ────────────────────────────────────────────────
export const mailingQueue  = new Queue('mailing',  { connection })
export const parsingQueue  = new Queue('parsing',  { connection })
export const warmupQueue   = new Queue('warmup',   { connection })
export const defaultQueue  = new Queue('default',  { connection })

// ── Helpers ───────────────────────────────────────────────
export async function addMailingJob(campaignId) {
  return mailingQueue.add('run_campaign', { campaignId }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  })
}

export async function addParsingJob(channelId, accountId, limit = 5000) {
  return parsingQueue.add('parse_members', { channelId, accountId, limit }, {
    attempts: 2,
    removeOnComplete: 50,
  })
}

export async function addWarmupJob(accountId, delay = 0) {
  return warmupQueue.add('warmup_step', { accountId }, {
    delay,
    attempts: 2,
    removeOnComplete: 200,
  })
}

// Recurring schedules via BullMQ repeat
export async function setupScheduledJobs() {
  // Reset daily limits at midnight
  await defaultQueue.add('reset_daily_limits', {}, {
    repeat: { pattern: '0 0 * * *' },
    removeOnComplete: 1,
  })
  // Check proxies every 30 min
  await defaultQueue.add('check_proxies', {}, {
    repeat: { pattern: '*/30 * * * *' },
    removeOnComplete: 1,
  })
  // Smart warmup cycle every 2 hours
  await warmupQueue.add('warmup_cycle', {}, {
    repeat: { pattern: '0 */2 * * *' },
    removeOnComplete: 1,
  })
}
