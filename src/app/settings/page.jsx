'use client'
import { useState } from 'react'
import { Copy, CheckCheck, Link, Webhook } from 'lucide-react'
import { Layout, Topbar } from '@/components/layout/Layout'

const BASE = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.railway.app'

function CopyBlock({ value, label }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div>
      {label && <div className="text-[10px] font-mono text-muted uppercase tracking-widest mb-2">{label}</div>}
      <div className="flex items-center gap-2 bg-surface2 border border-border rounded-lg px-4 py-3">
        <code className="text-xs font-mono text-accent flex-1 break-all">{value}</code>
        <button onClick={copy} className="flex-shrink-0 text-muted hover:text-accent transition-colors">
          {copied ? <CheckCheck size={14} className="text-success"/> : <Copy size={14}/>}
        </button>
      </div>
    </div>
  )
}

export default function Settings() {
  return (
    <Layout>
      <Topbar title="Настройки" subtitle="Интеграции и конфигурация"/>
      <div className="p-8 max-w-2xl space-y-6">

        {/* CPA Postback */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Webhook size={16} className="text-accent"/>
            <span className="font-bold">Постбэк URL для CPA-сетей</span>
          </div>
          <CopyBlock
            value={`${BASE}/api/postback?sub_id={sub_id}&event=lead&payout={payout}`}
          />
          <div className="text-xs text-muted mt-3 leading-relaxed">
            Вставь этот URL в настройки постбэка CPA-сети (Admitad, LeadGid, Alfaleads). Параметры <code className="text-accent">sub_id</code> и <code className="text-accent">payout</code> передаются автоматически.
          </div>
        </div>

        {/* UTM Links */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Link size={16} className="text-accent"/>
            <span className="font-bold">UTM-редиректы</span>
          </div>
          <CopyBlock
            value={`${BASE}/r/{slug}`}
          />
          <div className="text-xs text-muted mt-3 leading-relaxed">
            Создавай UTM-ссылки во вкладке «Трекер». Каждая ссылка отслеживает клики и атрибутирует конверсии по slug.
          </div>
        </div>

        {/* Telegram Bot */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">🤖</span>
            <span className="font-bold">Telegram бот</span>
          </div>
          <div className="text-xs text-muted leading-relaxed space-y-2">
            <div>Бот отправляет уведомления о банах, завершённых рассылках и конверсиях.</div>
            <div>Настрой <code className="text-accent">BOT_TOKEN</code> и <code className="text-accent">ADMIN_CHAT_ID</code> в переменных Railway.</div>
            <div className="bg-surface2 rounded-lg px-3 py-2 mt-2">
              <div className="text-[10px] font-mono text-muted mb-1">Как получить ADMIN_CHAT_ID:</div>
              <div>1. Напиши боту <code className="text-accent">@userinfobot</code> в Telegram</div>
              <div>2. Скопируй свой ID и вставь в переменную Railway</div>
            </div>
          </div>
        </div>

      </div>
    </Layout>
  )
}
