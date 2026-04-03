// src/lib/agenda.js
// Клиент для добавления задач в очередь из Next.js API routes
// НЕ запускает обработку - это делает воркер (workers/agenda.js)

import Agenda from 'agenda'

const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://mongo:27017/tgarb_jobs'

let _agenda = null

async function getAgenda() {
  if (_agenda) return _agenda
  _agenda = new Agenda({
    db: { address: MONGODB_URL, collection: 'jobs' },
    // Не запускаем processEvery - только добавляем задачи
  })
  // НЕ вызываем agenda.start() - только подключаемся к MongoDB
  await _agenda._db.connect()
  return _agenda
}

// Добавить задачу для немедленного выполнения воркером
export async function scheduleNow(jobName, data = {}) {
  const ag = await getAgenda()
  return ag.now(jobName, data)
}

// Добавить задачу с задержкой
export async function scheduleIn(jobName, when, data = {}) {
  const ag = await getAgenda()
  return ag.schedule(when, jobName, data)
}
