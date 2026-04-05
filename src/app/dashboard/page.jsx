'use client'
import { useEffect, useState, useCallback } from 'react'
import { Radio, Send, DollarSign, Zap, CheckCircle2, Circle, ChevronDown, ChevronUp, AlertTriangle, ExternalLink } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Layout, Topbar } from '@/components/layout/Layout'
import { StatCard, useWebSocket } from '@/components/ui'

const TT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface border border-border rounded-lg px-3 py-2 text-xs font-mono">
      <div className="text-muted mb-1">{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</div>
      ))}
    </div>
  )
}

const STEPS = [
  {
    num: 1,
    title: 'Купи аккаунты нужного качества',
    status_key: 'accounts',
    color: '#00e5ff',
    icon: '👤',
    desc: 'Нужны прогретые аккаунты того же ГЕО что и твоя аудитория. Для USA — номера на TextNow или покупай у продавцов с пометкой "прогретые USA".',
    warn: 'Холодные/свежие аккаунты банит Telegram уже через 1-2 дня рассылки.',
    actions: [
      { label: 'Импортировать аккаунт', href: '/accounts', primary: true },
    ],
    check: (data) => data.accounts > 0,
    checkLabel: (data) => data.accounts > 0 ? `✅ ${data.accounts} аккаунт(ов) добавлено` : '❌ Нет аккаунтов',
  },
  {
    num: 2,
    title: 'Подключи прокси (рекомендуется)',
    status_key: 'proxies',
    color: '#a78bfa',
    icon: '🔒',
    desc: 'Прокси защищает аккаунты от блокировки по IP. Используй SOCKS5 прокси того же ГЕО что и аккаунт. Если аккаунт USA — прокси USA.',
    warn: 'Без прокси все аккаунты работают с IP сервера Railway. Это нормально для прогрева, но рискованно для рассылок.',
    actions: [
      { label: 'Добавить прокси', href: '/accounts', primary: false },
    ],
    check: (data) => data.proxies > 0,
    checkLabel: (data) => data.proxies > 0 ? `✅ ${data.proxies} прокси добавлено` : '⚠️ Прокси не настроены (необязательно)',
    optional: true,
  },
  {
    num: 3,
    title: 'Подключи аккаунт и запусти прогрев',
    status_key: 'warming',
    color: '#ffd32a',
    icon: '🔥',
    desc: 'Нажми Wi-Fi на аккаунте чтобы подключить его к Telegram. Затем зайди в «Прогрев» и выбери нишу. Прогрев идёт 5 дней автоматически каждые 2 часа.',
    warn: 'НЕ запускай рассылки до завершения прогрева — аккаунт заблокируют. После 5 дней статус изменится на «Готов».',
    timeline: [
      { day: 'День 1-2', text: 'Подписки на каналы ниши (3-5/день), чтение постов' },
      { day: 'День 3-4', text: 'Реакции на посты, комментарии в чатах' },
      { day: 'День 5',   text: 'Аккаунт готов — статус «Готов» в таблице' },
    ],
    actions: [
      { label: 'Перейти в Прогрев', href: '/warmup', primary: true },
    ],
    check: (data) => data.warmed > 0,
    checkLabel: (data) => data.warmed > 0
      ? `✅ ${data.warmed} аккаунт(ов) готово к рассылке`
      : data.warming > 0
        ? `⏳ ${data.warming} аккаунт(ов) в прогреве`
        : '❌ Нет прогретых аккаунтов',
  },
  {
    num: 4,
    title: 'Найди каналы с целевой аудиторией',
    status_key: 'channels',
    color: '#00ff9d',
    icon: '📡',
    desc: 'Найди Telegram каналы/группы где сидит твоя аудитория. Добавь их во вкладке «Каналы». Важно: для парсинга нужны ГРУППЫ (чаты), не broadcast-каналы.',
    warn: 'Broadcast-каналы (большинство крупных каналов) не дают список подписчиков — Telegram API не позволяет. Ищи группы обсуждения или тематические чаты.',
    actions: [
      { label: 'Поиск каналов', href: '/discover', primary: true },
      { label: 'Мои каналы', href: '/channels', primary: false },
    ],
    check: (data) => data.channels > 0,
    checkLabel: (data) => data.channels > 0 ? `✅ ${data.channels} каналов добавлено` : '❌ Нет каналов',
  },
  {
    num: 5,
    title: 'Спарси участников',
    status_key: 'parsed',
    color: '#ff6b35',
    icon: '👥',
    desc: 'Во вкладке «Каналы» нажми кнопку ↓ рядом с каналом. Воркер соберёт список участников в базу данных. Это займёт 1-5 минут в зависимости от размера группы.',
    warn: 'Telegram ограничивает парсинг — не парси больше 5000 человек в час с одного аккаунта.',
    actions: [
      { label: 'Мои каналы', href: '/channels', primary: true },
    ],
    check: (data) => data.parsed > 0,
    checkLabel: (data) => data.parsed > 0 ? `✅ ${data.parsed.toLocaleString()} участников в базе` : '❌ База пустая — запусти парсинг',
  },
  {
    num: 6,
    title: 'Создай и запусти рассылку',
    status_key: 'campaigns',
    color: '#ff4757',
    icon: '🚀',
    desc: 'Во вкладке «Рассылки» создай кампанию: выбери каналы-источники, напиши текст, укажи аккаунт и задержку. Рекомендуемая задержка — 30-60 секунд.',
    warn: 'Лимиты: 20-30 DM в день с одного аккаунта. Больше — бан. Используй несколько аккаунтов для ротации.',
    tips: [
      'Задержка 30-60 сек между сообщениями — обязательно',
      'Не более 30 сообщений в день с одного аккаунта',
      'Персонализируй текст — одинаковые сообщения банят быстрее',
      'Добавь UTM-ссылку для отслеживания конверсий',
    ],
    actions: [
      { label: 'Создать рассылку', href: '/campaigns', primary: true },
    ],
    check: (data) => data.campaigns > 0,
    checkLabel: (data) => data.campaigns > 0 ? `✅ ${data.campaigns} кампаний создано` : '⌛ Ожидает',
  },
]

export default function Dashboard() {
  const [stats,     setStats]     = useState(null)
  const [data,      setData]      = useState({ accounts: 0, proxies: 0, warming: 0, warmed: 0, channels: 0, parsed: 0, campaigns: 0 })
  const [liveFeed,  setLiveFeed]  = useState([])
  const [expanded,  setExpanded]  = useState({ 0: true })
  const [conversions, setConversions] = useState([])

  useWebSocket({ onEvent: useCallback((event, d) => {
    if (event === 'new_post') {
      const now = new Date()
      const t = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
      const colors = ['#00e5ff','#00ff9d','#a78bfa','#ff6b35','#ffd32a']
      setLiveFeed(prev => [{ ch: `@${d.channel}`, text: d.text, color: colors[Math.floor(Math.random()*colors.length)], t }, ...prev].slice(0, 20))
    }
    if (event === 'conversion') {
      setConversions(prev => [{ ...d, ts: Date.now() }, ...prev].slice(0, 10))
    }
  }, []) })

  useEffect(() => {
    // Load all stats
    Promise.all([
      fetch('/api/accounts').then(r=>r.json()).catch(()=>[]),
      fetch('/api/proxies').then(r=>r.json()).catch(()=>[]),
      fetch('/api/warmup/stats').then(r=>r.json()).catch(()=>({})),
      fetch('/api/channels').then(r=>r.json()).catch(()=>[]),
      fetch('/api/campaigns').then(r=>r.json()).catch(()=>[]),
      fetch('/api/analytics/dashboard').then(r=>r.json()).catch(()=>null),
    ]).then(([accounts, proxies, warmupStats, channels, campaigns, analytics]) => {
      const parsed = channels.reduce((s, c) => s + (c.parsedCount || 0), 0)
      setData({
        accounts: accounts.length,
        proxies: proxies.length,
        warming: warmupStats?.warming || 0,
        warmed: accounts.filter(a => a.isWarmed || a.warmupDays >= 5).length,
        channels: channels.length,
        parsed,
        campaigns: campaigns.length,
      })
      setStats(analytics)
      // Auto-expand first incomplete step
      const firstIncomplete = STEPS.findIndex(s => !s.check({ accounts: accounts.length, proxies: proxies.length, warming: warmupStats?.warming||0, warmed: accounts.filter(a=>a.isWarmed||a.warmupDays>=5).length, channels: channels.length, parsed, campaigns: campaigns.length }))
      if (firstIncomplete >= 0) setExpanded({ [firstIncomplete]: true })
    })
  }, [])

  const chartData = stats?.dailyStats || Array.from({ length: 7 }, (_, i) => ({
    day: ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'][i],
    sent: 0, leads: 0,
  }))

  const completedSteps = STEPS.filter(s => !s.optional && s.check(data)).length
  const totalRequired = STEPS.filter(s => !s.optional).length

  return (
    <Layout>
      <Topbar title="Обзор" subtitle={`Быстрый старт: ${completedSteps}/${totalRequired} шагов выполнено`}/>

      <div className="p-8 space-y-6">

        {/* Progress bar */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-bold text-sm">Готовность к арбитражу</div>
            <div className="text-xs font-mono text-muted">{completedSteps}/{totalRequired} шагов</div>
          </div>
          <div className="w-full bg-surface2 rounded-full h-2 mb-3">
            <div className="h-2 rounded-full bg-gradient-to-r from-accent to-accent3 transition-all duration-500"
              style={{ width: `${(completedSteps / totalRequired) * 100}%` }}/>
          </div>
          <div className="flex gap-2 flex-wrap">
            {STEPS.map((s, i) => {
              const done = s.check(data)
              return (
                <div key={i} className={`flex items-center gap-1.5 text-[11px] font-mono px-2 py-1 rounded-full border
                  ${done ? 'border-success/30 text-success bg-success/5' : 'border-border text-muted'}`}>
                  {done ? <CheckCircle2 size={10}/> : <Circle size={10}/>}
                  {s.num}. {s.title.split(' ').slice(0,2).join(' ')}
                </div>
              )
            })}
          </div>
        </div>

        {/* Step by step guide */}
        <div className="space-y-3">
          {STEPS.map((step, i) => {
            const done = step.check(data)
            const isOpen = expanded[i]
            return (
              <div key={i} className={`card overflow-hidden border-l-4 transition-all
                ${done ? 'border-l-success' : 'border-l-border'}`}
                style={{ borderLeftColor: done ? '#00ff9d' : step.color + '44' }}>

                {/* Header */}
                <button className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-surface2/30 transition-colors"
                  onClick={() => setExpanded(p => ({ ...p, [i]: !p[i] }))}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{ background: step.color + '15', border: `1px solid ${step.color}30` }}>
                    {step.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-muted">ШАГ {step.num}</span>
                      {step.optional && <span className="text-[10px] font-mono text-muted bg-surface2 px-1.5 rounded">необязательно</span>}
                    </div>
                    <div className="font-bold text-sm">{step.title}</div>
                    <div className="text-[11px] font-mono mt-0.5" style={{ color: done ? '#00ff9d' : '#5a5f72' }}>
                      {step.checkLabel(data)}
                    </div>
                  </div>
                  {isOpen ? <ChevronUp size={16} className="text-muted flex-shrink-0"/> : <ChevronDown size={16} className="text-muted flex-shrink-0"/>}
                </button>

                {/* Content */}
                {isOpen && (
                  <div className="px-5 pb-5 border-t border-border/50 pt-4 space-y-4">
                    <p className="text-sm text-muted leading-relaxed">{step.desc}</p>

                    {step.warn && (
                      <div className="flex gap-2 bg-yellow-400/5 border border-yellow-400/20 rounded-lg px-3 py-2.5">
                        <AlertTriangle size={14} className="text-yellow-400 flex-shrink-0 mt-0.5"/>
                        <p className="text-xs text-yellow-400/90 leading-relaxed">{step.warn}</p>
                      </div>
                    )}

                    {step.timeline && (
                      <div className="space-y-2">
                        {step.timeline.map((t, j) => (
                          <div key={j} className="flex gap-3 items-start">
                            <div className="text-[10px] font-mono text-accent bg-accent/10 px-2 py-1 rounded flex-shrink-0">{t.day}</div>
                            <div className="text-xs text-muted pt-1">{t.text}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {step.tips && (
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-mono text-muted uppercase tracking-widest">Советы:</div>
                        {step.tips.map((tip, j) => (
                          <div key={j} className="flex gap-2 text-xs text-muted">
                            <span className="text-success flex-shrink-0">✓</span> {tip}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      {step.actions.map((action, j) => (
                        <a key={j} href={action.href}
                          className={action.primary ? 'btn-primary text-sm' : 'btn-ghost text-sm'}>
                          {action.label} <ExternalLink size={12}/>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Stats row - only show if there's data */}
        {(stats || data.accounts > 0) && (
          <div className="grid grid-cols-4 gap-4">
            <StatCard icon={Radio}      label="Аккаунтов"   value={data.accounts}          color="#00e5ff"/>
            <StatCard icon={Zap}        label="Прогрето"     value={data.warmed}            color="#ffd32a"/>
            <StatCard icon={Send}       label="В базе"       value={data.parsed.toLocaleString()} color="#00ff9d"/>
            <StatCard icon={DollarSign} label="Кампаний"     value={data.campaigns}         color="#a78bfa"/>
          </div>
        )}

        {/* Chart + Live feed */}
        <div className="grid grid-cols-5 gap-5">
          <div className="col-span-3 card p-5">
            <div className="font-bold text-sm mb-4">Активность за 7 дней</div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="gs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#00e5ff" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#00e5ff" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize:10, fill:'#5a5f72', fontFamily:'monospace' }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize:10, fill:'#5a5f72', fontFamily:'monospace' }} axisLine={false} tickLine={false} width={28}/>
                <Tooltip content={<TT/>}/>
                <Area type="monotone" dataKey="sent" name="Отправлено" stroke="#00e5ff" strokeWidth={2} fill="url(#gs)"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="col-span-2 card">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div className="font-bold text-sm">Живая лента</div>
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-success">
                <span className="w-1.5 h-1.5 rounded-full bg-success pulse-dot"/> LIVE
              </div>
            </div>
            <div className="divide-y divide-border max-h-48 overflow-y-auto">
              {liveFeed.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <div className="text-2xl mb-2">📡</div>
                  <div className="text-xs font-bold text-muted mb-1">Лента пуста</div>
                  <div className="text-[11px] font-mono text-muted/60 leading-relaxed">
                    Добавь каналы и включи Мониторинг — посты появятся здесь
                  </div>
                </div>
              ) : liveFeed.map((item, i) => (
                <div key={i} className="flex gap-3 px-5 py-3 hover:bg-surface2/50 transition-colors">
                  <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                    style={{ background: item.color }}/>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-bold" style={{ color: item.color }}>{item.ch}</span>
                      <span className="text-[10px] font-mono text-muted">{item.t}</span>
                    </div>
                    <p className="text-xs text-muted leading-snug truncate">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </Layout>
  )
}
