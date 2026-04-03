// src/lib/agenda.js
// Добавляет задачи напрямую в MongoDB через mongoose

import mongoose from 'mongoose'

const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://mongo:27017/tgarb_jobs'

let connected = false

async function connect() {
  if (connected && mongoose.connection.readyState === 1) return
  await mongoose.connect(MONGODB_URL)
  connected = true
}

// Схема совместима с Agenda.js формата
const jobSchema = new mongoose.Schema({
  name:           String,
  data:           mongoose.Schema.Types.Mixed,
  type:           { type: String, default: 'normal' },
  priority:       { type: Number, default: 0 },
  nextRunAt:      Date,
  lastModifiedBy: String,
  lockedAt:       Date,
  lastRunAt:      Date,
  lastFinishedAt: Date,
  failCount:      { type: Number, default: 0 },
  failedAt:       Date,
}, { collection: 'jobs' })

let JobModel = null

function getModel() {
  if (!JobModel) {
    JobModel = mongoose.models.Job || mongoose.model('Job', jobSchema)
  }
  return JobModel
}

export async function scheduleNow(jobName, data = {}) {
  await connect()
  const Job = getModel()
  const job = await Job.create({
    name: jobName,
    data,
    type: 'normal',
    priority: 0,
    nextRunAt: new Date(),
    lockedAt: null,
  })
  console.log(`[agenda] queued: ${jobName}`, JSON.stringify(data))
  return job
}

export async function scheduleIn(jobName, when, data = {}) {
  await connect()
  const Job = getModel()
  const runAt = typeof when === 'string' ? parseWhen(when) : new Date(when)
  return Job.create({
    name: jobName,
    data,
    type: 'normal',
    priority: 0,
    nextRunAt: runAt,
    lockedAt: null,
  })
}

function parseWhen(str) {
  const m = str.match(/(\d+)\s*(second|minute|hour)/)
  if (!m) return new Date()
  const n = parseInt(m[1])
  const mult = m[2] === 'second' ? 1000 : m[2] === 'minute' ? 60000 : 3600000
  return new Date(Date.now() + n * mult)
}
