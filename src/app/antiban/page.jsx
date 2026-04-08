'use client'
import { useEffect, useState } from 'react'
import { Shield, AlertTriangle, CheckCircle2, XCircle, RefreshCw, Info } from 'lucide-react'
import { Layout, Topbar } from '@/components/layout/Layout'
import { Badge, Spinner } from '@/components/ui'

const RISK = {
  low:    { label: 'Низкий',   color: 'text-success',      bg: 'bg-success/10 border-success/20',       icon: CheckCircle2 },
  medium: { label: 'Средний',  color: 'text-yellow-400',   bg: 'bg-yellow-400/10 border-yellow-400/20', icon: AlertTriangle },
  high:   { label: 'Высокий',  color: 'text-orange-400',   bg: 'bg-orange-400/10 border-orange-400/20', icon: AlertTriangle },
  banned: { label: 'Забанен',  color: 'text-danger',        bg: 'bg-danger/10 border-danger/20',         icon: XCircle },
}

const TIPS = [
  { risk: 'all', tip: 'Используй спинтакс в шаблонах: {Привет|Здравствуй|Добрый день}, {имя|друг}! — каждое сообщение будет уникальным' },
  { risk: 'all', tip: 'Задержка между сообщениями: минимум 30 сек, лучше 45-90 сек с джиттером' },
  { risk: 'all', tip: 'Максимум 20-30 DM в день с одного аккаунта — Telegram следит за частотой' },
  { risk: 'high', tip: 'Привяжи прокси того же ГЕО что и аккаунт — разные IP = красный флаг' },
  { risk: 'high', tip: 'Аккаунт без прогрева = высокий риск бана при первой рассылке' },
  { risk: 'all', tip: 'Каждые 20 сообщений система делает антибан паузу 5-10 мин — не отключай' },
  { risk: 'all', tip: 'Проверяй SpamBot каждые 3 дня — кнопка 🛡 в разделе Аккаунты' },
  { risk: 'all', tip: 'Не запускай рассылки ночью — Telegram замечает нечеловеческие часы активности' },
]

export default function AntiBan() {
  const [report,  setReport]  = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const data = await fetch('/api/antiban').then(r=>r.json()).catch(()=>[])
    setReport(Array.isArray(data) ? data : [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const byRisk = {
    low:    report.filter(a => a.riskLevel === 'low'),
    medium: report.filter(a => a.riskLevel === 'medium'),
    high:   report.filter(a => a.riskLevel === 'high'),
    banned: report.filter(a => a.riskLevel === 'banned'),
  }

  const safeCount  = byRisk.low.length
  const totalCount = report.length
  const safePercent = totalCount > 0 ? Math.round((safeCount / totalCount) * 100) : 0

  return (
    <Layout>
      <Topbar title="Антибан защита" subtitle="Мониторинг здоровья аккаунтов"
        actions={<button className="btn-ghost" onClick={load}><RefreshCw size={14}/> Обновить</button>}/>

      <div className="p-8 space-y-6">
        {/* Overall score */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card p-5 col-span-1">
            <div className="text-[10px] font-mono text-muted uppercase mb-2">Общая защита</div>
            <div className={`text-4xl font-black mb-1 ${safePercent >= 70 ? 'text-success' : safePercent >= 40 ? 'text-yellow-400' : 'text-danger'}`}>
              {safePercent}%
            </div>
            <div className="w-full bg-surface2 rounded-full h-1.5 mt-2">
              <div className="h-1.5 rounded-full transition-all" style={{
                width: `${safePercent}%`,
                background: safePercent >= 70 ? '#00ff9d' : safePercent >= 40 ? '#ffd32a' : '#ff4757'
              }}/>
            </div>
            <div className="text-[10px] font-mono text-muted mt-2">{safeCount} из {totalCount} в норме</div>
          </div>
          {Object.entries(byRisk).map(([risk, accs]) => {
            const meta = RISK[risk]
            const Icon = meta.icon
            return (
              <div key={risk} className={`card p-5 border ${meta.bg}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon size={14} className={meta.color}/>
                  <span className={`text-[10px] font-mono uppercase ${meta.color}`}>{meta.label} риск</span>
                </div>
                <div className={`text-3xl font-black ${meta.color}`}>{accs.length}</div>
                <div className="text-[10px] font-mono text-muted mt-1">аккаунтов</div>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Accounts list */}
          <div className="col-span-2 space-y-3">
            <div className="text-sm font-bold">Состояние аккаунтов</div>
            {loading ? <div className="flex justify-center py-12"><Spinner/></div>
            : report.length === 0 ? (
              <div className="card p-8 text-center text-muted text-sm">Нет аккаунтов</div>
            ) : (
              [...byRisk.high, ...byRisk.banned, ...byRisk.medium, ...byRisk.low].map(acc => {
                const meta = RISK[acc.riskLevel]
                const Icon = meta.icon
                const issues = []
                if (!acc.isWarmed) issues.push('Не прогрет')
                if (!acc.hasProxy) issues.push('Нет прокси')
                if (acc.riskLevel === 'banned') issues.push('Забанен')
                return (
                  <div key={acc.id} className={`card p-4 border ${meta.bg}`}>
                    <div className="flex items-center gap-3">
                      <Icon size={16} className={`${meta.color} flex-shrink-0`}/>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm">{acc.phone}</span>
                          <span className={`text-[10px] font-mono font-bold ${meta.color}`}>{meta.label} риск</span>
                          {acc.geo && <span className="text-[10px] font-mono text-muted">{acc.geo}</span>}
                          {acc.hasProxy && <span className="text-[10px] text-success">🔒 прокси</span>}
                        </div>
                        <div className="flex gap-4 mt-1 text-[11px] font-mono text-muted">
                          <span>Прогрев: {acc.warmupDays}/5 дней</span>
                          <span>Отправлено: {acc.sentToday}/{acc.limit}/д</span>
                          <span className={acc.pct > 80 ? 'text-danger' : acc.pct > 50 ? 'text-yellow-400' : 'text-success'}>
                            {acc.pct}% лимита
                          </span>
                        </div>
                        {issues.length > 0 && (
                          <div className="flex gap-2 mt-1 flex-wrap">
                            {issues.map((issue, i) => (
                              <span key={i} className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${meta.bg} ${meta.color}`}>
                                ⚠ {issue}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* Progress bar */}
                      <div className="w-16">
                        <div className="w-full bg-surface2 rounded-full h-1">
                          <div className="h-1 rounded-full" style={{
                            width: `${Math.min(acc.pct, 100)}%`,
                            background: acc.pct > 80 ? '#ff4757' : acc.pct > 50 ? '#ffd32a' : '#00ff9d'
                          }}/>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Tips sidebar */}
          <div className="space-y-3">
            <div className="text-sm font-bold flex items-center gap-2">
              <Shield size={14} className="text-accent"/> Советы по защите
            </div>
            {TIPS.map((t, i) => (
              <div key={i} className="bg-surface2 border border-border rounded-xl p-3 flex gap-2">
                <Info size={13} className="text-accent flex-shrink-0 mt-0.5"/>
                <p className="text-[11px] text-muted leading-relaxed">{t.tip}</p>
              </div>
            ))}

            {/* Spintext example */}
            <div className="card p-4 border border-accent/20 bg-accent/5">
              <div className="text-xs font-bold text-accent mb-2">💡 Пример спинтакса</div>
              <div className="text-[11px] font-mono text-muted leading-relaxed bg-surface2 rounded p-2">
                {'{'}<span className="text-success">Привет</span>|<span className="text-yellow-400">Здравствуй</span>|<span className="text-accent">Добрый день</span>{'}'}, {'{'}<span className="text-success">друг</span>|<span className="text-yellow-400">коллега</span>{'}'}{`!\n\nУ нас есть для тебя {'{'}`}<span className="text-accent">выгодное</span>|<span className="text-success">интересное</span>{'}'} предложение.
              </div>
              <div className="text-[10px] text-muted mt-2">→ Каждый раз разный текст, Telegram не видит паттерн</div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
