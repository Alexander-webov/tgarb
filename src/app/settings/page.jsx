'use client'
// src/app/settings/page.jsx
import { Layout, Topbar } from '@/components/layout/Layout'

export default function Settings() {
  return (
    <Layout>
      <Topbar title="Настройки" subtitle="Конфигурация сервиса"/>
      <div className="p-8 space-y-5 max-w-2xl">
        <div className="card p-5">
          <div className="text-sm font-bold mb-3">Постбэк URL для CPA-сетей</div>
          <div className="bg-surface2 rounded-lg p-3 font-mono text-xs text-accent break-all">
            {typeof window !== 'undefined' ? window.location.origin : 'https://yourdomain.com'}/api/postback?sub_id={'{sub_id}'}&event=lead&payout={'{payout}'}
          </div>
          <p className="text-xs text-muted mt-2">Вставь этот URL в настройки постбэка CPA-сети. Параметры передаются автоматически.</p>
        </div>
        <div className="card p-5">
          <div className="text-sm font-bold mb-3">UTM-редиректы</div>
          <div className="bg-surface2 rounded-lg p-3 font-mono text-xs text-success break-all">
            {typeof window !== 'undefined' ? window.location.origin : 'https://yourdomain.com'}/r/{'{slug}'}
          </div>
          <p className="text-xs text-muted mt-2">Каждая UTM-ссылка отслеживает клики и атрибутирует конверсии по slug.</p>
        </div>
        <div className="card p-5">
          <div className="text-sm font-bold mb-3">Переменные окружения (.env)</div>
          <div className="space-y-2">
            {[
              ['TG_API_ID',      'ID приложения с my.telegram.org'],
              ['TG_API_HASH',    'Hash приложения с my.telegram.org'],
              ['BOT_TOKEN',      'Токен бота от @BotFather'],
              ['DATABASE_URL',   'postgresql://user:pass@host:5432/db'],
              ['MONGODB_URL',    'mongodb://mongo:27017/tgarb_jobs (для Agenda)'],
              ['ADMITAD_TOKEN',  'API ключ Admitad (опционально)'],
              ['LEADGID_API_KEY','API ключ LeadGid (опционально)'],
            ].map(([k,v]) => (
              <div key={k} className="flex gap-3 text-xs">
                <span className="font-mono text-accent w-40 flex-shrink-0">{k}</span>
                <span className="text-muted">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}
