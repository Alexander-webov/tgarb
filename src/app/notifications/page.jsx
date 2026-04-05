'use client'
import { useEffect, useState } from 'react'
import { Bell, CheckCheck, Ban, Flame, Send, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { Layout, Topbar } from '@/components/layout/Layout'
import { Spinner } from '@/components/ui'

const TYPE_META = {
  ban:           { icon: Ban,          color: 'text-danger',   bg: 'bg-danger/10 border-danger/20',   label: 'Аккаунт забанен' },
  warmup_done:   { icon: Flame,        color: 'text-success',  bg: 'bg-success/10 border-success/20', label: 'Прогрев завершён' },
  warmup_step:   { icon: Flame,        color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20', label: 'Шаг прогрева' },
  campaign_done: { icon: Send,         color: 'text-accent',   bg: 'bg-accent/10 border-accent/20',   label: 'Рассылка завершена' },
  limited:       { icon: AlertTriangle,color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20', label: 'Аккаунт ограничен' },
  conversion:    { icon: CheckCircle2, color: 'text-success',  bg: 'bg-success/10 border-success/20', label: 'Конверсия' },
  info:          { icon: Info,         color: 'text-muted',    bg: 'bg-surface2 border-border',       label: 'Информация' },
}

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'только что'
  if (m < 60) return `${m} мин назад`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} ч назад`
  return `${Math.floor(h / 24)} дн назад`
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const data = await fetch('/api/notifications').then(r => r.json()).catch(() => [])
    setNotifications(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  const markAllRead = async () => {
    await fetch('/api/notifications', { method: 'PATCH' })
    load()
  }

  useEffect(() => { load() }, [])

  const unread = notifications.filter(n => !n.isRead).length

  return (
    <Layout>
      <Topbar title="Уведомления"
        subtitle={unread > 0 ? `${unread} непрочитанных` : 'Все прочитаны'}
        actions={
          unread > 0 && (
            <button className="btn-ghost" onClick={markAllRead}>
              <CheckCheck size={14}/> Прочитать все
            </button>
          )
        }/>

      <div className="p-8 max-w-2xl">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner/></div>
        ) : notifications.length === 0 ? (
          <div className="card p-12 text-center">
            <Bell size={32} className="text-muted mx-auto mb-4 opacity-30"/>
            <div className="text-sm font-bold text-muted mb-2">Уведомлений нет</div>
            <div className="text-xs font-mono text-muted/60">
              Здесь появятся уведомления о банах, прогреве, рассылках и конверсиях
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map(n => {
              const meta = TYPE_META[n.type] || TYPE_META.info
              const Icon = meta.icon
              return (
                <div key={n.id} className={`border rounded-xl p-4 flex gap-3 transition-opacity ${meta.bg} ${n.isRead ? 'opacity-60' : ''}`}>
                  <Icon size={16} className={`${meta.color} flex-shrink-0 mt-0.5`}/>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[10px] font-mono font-bold uppercase ${meta.color}`}>{meta.label}</span>
                      {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0"/>}
                    </div>
                    <div className="text-sm text-[#e8eaf0]">{n.message}</div>
                    <div className="text-[10px] font-mono text-muted mt-1">{timeAgo(n.createdAt)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
