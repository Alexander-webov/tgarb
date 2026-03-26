// src/lib/env.js
export const env = {
  DATABASE_URL:        process.env.DATABASE_URL        || 'postgresql://tgarb:secret@localhost:5432/tgarb',
  REDIS_URL:           process.env.REDIS_URL           || 'redis://localhost:6379',
  TG_API_ID:           Number(process.env.TG_API_ID    || 0),
  TG_API_HASH:         process.env.TG_API_HASH         || '',
  BOT_TOKEN:           process.env.BOT_TOKEN           || '',
  TRACKER_BASE_URL:    process.env.TRACKER_BASE_URL    || 'http://localhost:3000/r',
  ADMITAD_TOKEN:       process.env.ADMITAD_TOKEN       || '',
  ADMITAD_PUBLISHER_ID:process.env.ADMITAD_PUBLISHER_ID|| '',
  LEADGID_API_KEY:     process.env.LEADGID_API_KEY     || '',
  ALFALEADS_API_KEY:   process.env.ALFALEADS_API_KEY   || '',
  ADMIN_CHAT_ID:       process.env.ADMIN_CHAT_ID       || '',
}
