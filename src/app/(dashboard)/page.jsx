'use client'
// src/app/(dashboard)/page.jsx
import { useEffect, useState, useRef, useCallback } from 'react'
import { Radio, Send, DollarSign, Zap, X, Info } from 'lucide-react'
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

export default function Dashboard() {
  const [stats,    setStats]    = useState(null)
  const [cpaStats, setCpaStats] = useState(null)
  const [alerts,   setAlerts]   = useState([])
  const [conversions, setConversions] = useState([])
  const feedIdx = useRef(0)

  const [liveFeed, setLiveFeed] = useState([
    { ch: '@cryptowhales', text: 'Новый сигнал по USDT — огромный объём входит', kw: 'USDT',    color: '#00e5ff', t: '14:32' },
    { ch: '@arbsecret',    text: 'Закрытый слив на топовый оффер — только своих', kw: 'слив',    color: '#a78bfa', t: '14:29' },
    { ch: '@dropsmoney',   text: 'Получи депозит 200% бонусом — акция до конца', kw: 'депозит', color: '#00ff9d', t: '14:25' },
    { ch: '@bettersclub',  text: 'Экспресс на вечер — крипта против беттинга',   kw: 'крипта',  color: '#ff6b35', t: '14:21' },
  ])

  // WebSocket live events
  useWebSocket({
    onEvent: useCallback((event, data) => {
      if (event === 'system_alert') {
        setAlerts(prev => [{ ...data, id: Date.now() }, ...prev].slice(0, 5))
      }
      if (event === 'conversion') {
        setConversions(prev => [{ ...data, ts: Date.now() }, ...prev].slice(0, 10))
      }
      if (event === 'new_post') {
        const now = new Date()
        const t = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
        setLiveFeed(prev => [{ ch: `@${data.channel}`, text: data.text, kw: data.keywords?.[0] || '', color: '#00e5ff', t }, ...prev].slice(0, 10))
      }
    }, []),
  })

  useEffect(() => {
    fetch('/api/analytics/dashboard').then(r => r.json()).then(setStats).catch(() => {})
    fetch('/api/cpa/stats').then(r => r.json()).then(setCpaStats).catch(() => {})
  }, [])

  const chartData = stats?.dailyStats || Array.from({ length: 7 }, (_, i) => ({
    day: ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'][i],
    sent: [420,680,510,890,730,960,1284][i],
    leads: [18,31,22,44,38,51,63][i],
  }))

  return (
    <Layout>
      <Topbar title="Обзор" subtitle="Dashboard · Real-time"/>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="px-8 pt-4 space-y-2">
          {alerts.slice(0,3).map(a => (
            <div key={a.id} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-mono border
              ${a.level === 'error'   ? 'bg-danger/5 border-danger/20 text-danger' :
                a.level === 'warning' ? 'bg-warning/5 border-warning/20 text-warning' :
                'bg-success/5 border-success/20 text-success'}`}>
              <Info size={13}/>
              <span className="flex-1">{a.message}</span>
              <button onClick={() => setAlerts(p => p.filter(x => x.id !== a.id))}><X size={12}/></button>
            </div>
          ))}
        </div>
      )}

      <div className="p-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Каналов"    value={stats?.channels ?? '—'}                          icon={Radio}       accent="#00e5ff"/>
          <StatCard label="Отправлено" value={stats?.sentWeek?.toLocaleString() ?? '—'}         icon={Send}        accent="#00ff9d" delta="+18% к неделе" deltaUp/>
          <StatCard label="Лиды"       value={cpaStats?.total?.leads ?? stats?.leadsWeek ?? '—'} icon={Zap}        accent="#ff6b35" delta="+12%" deltaUp/>
          <StatCard label="Доход"      value={`$${Math.round(cpaStats?.total?.revenue ?? stats?.revenueWeek ?? 0)}`} icon={DollarSign} accent="#7c3aed" delta="+$124 сегодня" deltaUp/>
        </div>

        <div className="grid grid-cols-3 gap-5">
          {/* Area chart */}
          <div className="col-span-2 card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="font-bold text-sm">Активность за 7 дней</div>
              <div className="flex gap-4 text-xs font-mono">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-accent inline-block"/>Отправлено</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-success inline-block"/>Лиды</span>
              </div>
            </div>
            <div className="p-5 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#00e5ff" stopOpacity={.15}/>
                      <stop offset="95%" stopColor="#00e5ff" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="gL" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#00ff9d" stopOpacity={.15}/>
                      <stop offset="95%" stopColor="#00ff9d" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fill:'#5a5f72', fontSize:11, fontFamily:'JetBrains Mono' }} axisLine={false} tickLine={false}/>
                  <YAxis hide/>
                  <Tooltip content={<TT/>}/>
                  <Area type="monotone" dataKey="sent"  name="Отправлено" stroke="#00e5ff" strokeWidth={2} fill="url(#gS)" dot={false}/>
                  <Area type="monotone" dataKey="leads" name="Лиды"       stroke="#00ff9d" strokeWidth={2} fill="url(#gL)" dot={false}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* CPA by network */}
          <div className="card">
            <div className="px-5 py-4 border-b border-border font-bold text-sm">CPA Сети</div>
            <div className="p-5 space-y-4">
              {[
                { n: 'Admitad',   c: '#00e5ff', data: cpaStats?.byNetwork?.admitad   },
                { n: 'LeadGid',   c: '#00ff9d', data: cpaStats?.byNetwork?.leadgid   },
                { n: 'Alfaleads', c: '#ff6b35', data: cpaStats?.byNetwork?.alfaleads },
                { n: 'Own',       c: '#a78bfa', data: null },
              ].map(net => {
                const leads   = net.data?.leads   ?? 0
                const revenue = net.data?.revenue ?? 0
                const total   = cpaStats?.total?.leads || 1
                return (
                  <div key={net.n}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-semibold" style={{ color: net.c }}>{net.n}</span>
                      <span className="font-mono text-muted">{leads} лидов · <span className="text-success">${revenue}</span></span>
                    </div>
                    <div className="h-1 bg-border rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100,(leads/total)*100)}%`, background: net.c }}/>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Live feed + keywords */}
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-2 card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="font-bold text-sm">Живая лента</div>
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-success">
                <span className="w-1.5 h-1.5 rounded-full bg-success pulse-dot"/> LIVE
              </div>
            </div>
            <div className="divide-y divide-border max-h-64 overflow-y-auto">
              {liveFeed.map((item, i) => (
                <div key={i} className="flex gap-3 px-5 py-3 hover:bg-surface2/50 transition-colors">
                  <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                       style={{ background: item.color, boxShadow: `0 0 6px ${item.color}60` }}/>
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

          {/* Recent conversions */}
          <div className="card">
            <div className="px-5 py-4 border-b border-border font-bold text-sm">Конверсии</div>
            <div className="p-4 space-y-2">
              {conversions.length === 0
                ? <p className="text-xs font-mono text-muted text-center py-4">Ожидание конверсий...</p>
                : conversions.slice(0,8).map((c, i) => (
                  <div key={i} className="flex items-center justify-between bg-surface2 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-success pulse-dot"/>
                      <span className="text-xs font-mono text-muted">{c.slug}</span>
                    </div>
                    <span className="text-sm font-black text-success">${c.payout || 0}</span>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
