// src/lib/agenda.js
// Лёгкий клиент Agenda для Next.js API routes
// Воркер запускается отдельно (workers/agenda.js)
// API routes только добавляют задачи через этот модуль

import Agenda from 'agenda'
import { env } from './env.js'

const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://mongo:27017/tgarb_jobs'

const globalForAgenda = globalThis

export const agenda = globalForAgenda.agenda ?? new Agenda({
  db: { address: MONGODB_URL, collection: 'jobs' },
  processEvery: '30 seconds',
  maxConcurrency: 1,   // API side только добавляет, не обрабатывает
})

if (process.env.NODE_ENV !== 'production') globalForAgenda.agenda = agenda

// Helper: добавить задачу и сразу запустить
export async function scheduleNow(jobName, data = {}) {
  await agenda.start()
  return agenda.now(jobName, data)
}

// Helper: добавить с задержкой
export async function scheduleIn(jobName, when, data = {}) {
  await agenda.start()
  return agenda.schedule(when, jobName, data)
}
