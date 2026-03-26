'use client'
// src/app/analytics/page.jsx
import { useEffect, useState } from 'react'
import { BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Layout, Topbar } from '@/components/layout/Layout'
import { StatCard } from '@/components/ui'
import { TrendingUp, MousePointer, Users, DollarSign } from 'lucide-react'

const TT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface border border-border rounded-lg px-3 py-2 text-xs font-mono">
      <div className="text-muted mb-1">{label}</div>
      {payload.map(p => <div key={p.name} style={{color:p.color}}>{p.name}: {p.value}</div>)}
    </div>
  )
}
const COLORS = ['#00e5ff','#00ff9d','#ff6b35','#a78bfa']
const PIE    = [{name:'Admitad',value:38},{name:'LeadGid',value:27},{name:'Alfaleads',value:20},{name:'Own',value:15}]

export default function Analytics() {
  const [stats, setStats] = useState(null)
  const [cpa,   setCpa]   = useState(null)
  useEffect(() => {
    fetch('/api/analytics/dashboard').then(r=>r.json()).then(setStats).catch(()=>{})
    fetch('/api/cpa/stats').then(r=>r.json()).then(setCpa).catch(()=>{})
  }, [])

  const daily = stats?.dailyStats || []
  const rev   = cpa?.total?.revenue ?? stats?.revenueWeek ?? 0
  const leads = cpa?.total?.leads   ?? stats?.leadsWeek   ?? 0
  const clicks= cpa?.total?.clicks  ?? 0
  const cr    = clicks > 0 ? +(leads/clicks*100).toFixed(2) : 0

  return (
    <Layout>
      <Topbar title="Аналитика" subtitle="ROI · Конверсии · Трафик"/>
      <div className="p-8 space-y-6">
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Кликов"  value={clicks.toLocaleString()} icon={MousePointer} accent="#00e5ff" delta="+18%" deltaUp/>
          <StatCard label="Лидов"   value={leads}                   icon={Users}        accent="#00ff9d" delta="+12%" deltaUp/>
          <StatCard label="CR"      value={`${cr}%`}                icon={TrendingUp}   accent="#ff6b35" delta="+0.4%" deltaUp/>
          <StatCard label="Доход"   value={`$${Math.round(rev)}`}   icon={DollarSign}   accent="#a78bfa" delta="+$247" deltaUp/>
        </div>
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-2 card">
            <div className="px-5 py-4 border-b border-border font-bold text-sm">Активность за 7 дней</div>
            <div className="p-5 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={daily}>
                  <XAxis dataKey="day" tick={{fill:'#5a5f72',fontSize:11,fontFamily:'JetBrains Mono'}} axisLine={false} tickLine={false}/>
                  <YAxis hide/>
                  <Tooltip content={<TT/>}/>
                  <Bar dataKey="sent"    name="Отправлено" fill="#00e5ff" opacity={0.7} radius={[3,3,0,0]}/>
                  <Bar dataKey="revenue" name="Выручка $"  fill="#00ff9d" opacity={0.7} radius={[3,3,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card">
            <div className="px-5 py-4 border-b border-border font-bold text-sm">Лиды по сетям</div>
            <div className="p-5 flex flex-col items-center">
              <PieChart width={140} height={140}>
                <Pie data={PIE} cx={70} cy={70} innerRadius={45} outerRadius={65} dataKey="value" strokeWidth={0}>
                  {PIE.map((_, i) => <Cell key={i} fill={COLORS[i]}/>)}
                </Pie>
              </PieChart>
              <div className="w-full mt-3 space-y-1.5">
                {PIE.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{background:COLORS[i]}}/>
                      <span className="font-mono text-muted">{d.name}</span>
                    </div>
                    <span className="font-mono font-bold" style={{color:COLORS[i]}}>{d.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
