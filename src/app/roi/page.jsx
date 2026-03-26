'use client'
// src/app/roi/page.jsx
import { useState, useEffect } from 'react'
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Layout, Topbar } from '@/components/layout/Layout'
import { StatCard } from '@/components/ui'
import { Target, Zap, TrendingUp, DollarSign } from 'lucide-react'

const usd = v => `$${Number(v).toLocaleString()}`
const pct = v => `${(v*100).toFixed(0)}%`

function Slider({ label, value, min, max, step=1, format, onChange }) {
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1.5">
        <label className="text-[11px] font-mono text-muted uppercase tracking-[1.5px]">{label}</label>
        <span className="text-sm font-black text-accent font-mono">{format ? format(value) : value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{background:`linear-gradient(to right,#00e5ff ${((value-min)/(max-min))*100}%,#252836 ${((value-min)/(max-min))*100}%)`}}/>
    </div>
  )
}

const DEFAULT = { accountsCost:50, proxiesCost:30, adsBudget:0, serverCost:30,
  messagesSent:1000, deliveryRate:0.85, clickRate:0.05, conversionRate:0.08, avgPayout:25 }

const TT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface border border-border rounded-lg px-3 py-2 text-xs font-mono">
      <div className="text-muted mb-1">{label}</div>
      {payload.map(p => <div key={p.name} style={{color:p.color}}>{p.name}: ${p.value}</div>)}
    </div>
  )
}

export default function ROICalc() {
  const [form,    setForm]    = useState(DEFAULT)
  const [result,  setResult]  = useState(null)
  const [history, setHistory] = useState([])
  const set = k => v => setForm(f => ({...f, [k]: v}))

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const res = await fetch('/api/analytics/roi', {
          method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(form),
        })
        setResult(await res.json())
      } catch {
        // Local fallback
        const tc = form.accountsCost+form.proxiesCost+form.adsBudget+form.serverCost
        const del = Math.floor(form.messagesSent*form.deliveryRate)
        const cl  = Math.floor(del*form.clickRate)
        const lds = Math.floor(cl*form.conversionRate)
        const rev = lds*form.avgPayout
        const prf = rev-tc
        setResult({ totalCost:tc, messagesDelivered:del, clicks:cl, leads:lds,
          revenue:+rev.toFixed(2), profit:+prf.toFixed(2),
          roiPct:tc>0?+((prf/tc*100).toFixed(1)):0,
          epc:cl>0?+(rev/cl).toFixed(3):0, epm:+(rev/form.messagesSent*1000).toFixed(2),
          cpl:lds>0?+(tc/lds).toFixed(2):0, breakevenLeads:Math.ceil(tc/form.avgPayout), isProfitable:prf>0 })
      }
    }, 300)
    return () => clearTimeout(t)
  }, [form])

  useEffect(() => {
    fetch('/api/analytics/roi?days=30').then(r=>r.json()).then(setHistory).catch(()=>{})
  }, [])

  const scenarios = [0.03,0.05,0.08,0.10,0.15,0.20].map(cr => {
    const tc  = form.accountsCost+form.proxiesCost+form.adsBudget+form.serverCost
    const del = Math.floor(form.messagesSent*form.deliveryRate)
    const cl  = Math.floor(del*form.clickRate)
    const lds = Math.floor(cl*cr)
    const rev = lds*form.avgPayout
    return { cr:`${(cr*100).toFixed(0)}%`, profit:Math.round(rev-tc), revenue:Math.round(rev) }
  })

  return (
    <Layout>
      <Topbar title="ROI Калькулятор" subtitle="Рассчитай прибыль до запуска кампании"/>
      <div className="p-8">
        <div className="grid grid-cols-3 gap-6">
          <div className="space-y-4">
            <div className="card p-5">
              <div className="text-xs font-mono text-muted uppercase tracking-widest mb-4">💸 Расходы</div>
              <Slider label="Аккаунты"      value={form.accountsCost}    min={0}    max={500}   step={10} format={usd} onChange={set('accountsCost')}/>
              <Slider label="Прокси"         value={form.proxiesCost}     min={0}    max={200}   step={5}  format={usd} onChange={set('proxiesCost')}/>
              <Slider label="Закупка постов" value={form.adsBudget}       min={0}    max={2000}  step={50} format={usd} onChange={set('adsBudget')}/>
              <Slider label="Сервер"         value={form.serverCost}      min={5}    max={200}   step={5}  format={usd} onChange={set('serverCost')}/>
            </div>
            <div className="card p-5">
              <div className="text-xs font-mono text-muted uppercase tracking-widest mb-4">📊 Трафик</div>
              <Slider label="Сообщений"    value={form.messagesSent}    min={100}  max={50000} step={100} format={v=>v.toLocaleString()} onChange={set('messagesSent')}/>
              <Slider label="Доставляемость" value={form.deliveryRate}  min={0.3}  max={1.0}   step={0.01} format={pct} onChange={set('deliveryRate')}/>
              <Slider label="CTR"           value={form.clickRate}       min={0.01} max={0.3}   step={0.01} format={pct} onChange={set('clickRate')}/>
              <Slider label="CR"            value={form.conversionRate}  min={0.01} max={0.5}   step={0.01} format={pct} onChange={set('conversionRate')}/>
            </div>
            <div className="card p-5">
              <div className="text-xs font-mono text-muted uppercase tracking-widest mb-4">💰 Монетизация</div>
              <Slider label="Выплата за лид" value={form.avgPayout}    min={1}    max={200}   step={1}  format={usd} onChange={set('avgPayout')}/>
            </div>
          </div>

          <div className="col-span-2 space-y-5">
            {result && (
              <div className={`card p-6 border-2 ${result.isProfitable ? 'border-success/40' : 'border-danger/40'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-xs font-mono text-muted uppercase tracking-widest">Прибыль</div>
                    <div className={`text-5xl font-black mt-1 ${result.isProfitable ? 'text-success' : 'text-danger'}`}>
                      {result.profit >= 0 ? '+' : ''}{usd(Math.round(result.profit))}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono text-muted uppercase mb-1">ROI</div>
                    <div className={`text-3xl font-black ${result.roiPct >= 0 ? 'text-success' : 'text-danger'}`}>
                      {result.roiPct >= 0 ? '+' : ''}{result.roiPct}%
                    </div>
                  </div>
                </div>
                <div className={`text-sm font-mono px-3 py-2 rounded-lg ${result.isProfitable ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                  {result.isProfitable
                    ? `✅ Прибыльно. Нужно ${result.breakevenLeads} лидов для окупаемости — ты берёшь ${result.leads}`
                    : `❌ Убыточно. Нужно ${result.breakevenLeads} лидов, получишь ${result.leads}. Снизь расходы или подними CR.`
                  }
                </div>
              </div>
            )}

            {result && (
              <div className="grid grid-cols-4 gap-3">
                <StatCard label="Доставлено" value={result.messagesDelivered?.toLocaleString()} icon={Target}    accent="#00e5ff"/>
                <StatCard label="Кликов"     value={result.clicks?.toLocaleString()}            icon={Zap}       accent="#ff6b35"/>
                <StatCard label="Лидов"      value={result.leads}                                icon={TrendingUp} accent="#00ff9d"/>
                <StatCard label="Выручка"    value={usd(Math.round(result.revenue||0))}         icon={DollarSign} accent="#a78bfa"/>
              </div>
            )}

            {result && (
              <div className="grid grid-cols-3 gap-4">
                {[
                  {label:'EPC (доход/клик)', value:`$${result.epc}`, color:'#00e5ff'},
                  {label:'EPM (доход/1000)', value:`$${result.epm}`, color:'#00ff9d'},
                  {label:'CPL (стоим. лида)', value:`$${result.cpl}`, color:'#ff6b35'},
                ].map(m => (
                  <div key={m.label} className="card p-4">
                    <div className="text-[10px] font-mono text-muted uppercase tracking-wider mb-1">{m.label}</div>
                    <div className="text-2xl font-black" style={{color:m.color}}>{m.value}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="card">
              <div className="px-5 py-4 border-b border-border font-bold text-sm">Сценарии при разном CR</div>
              <div className="p-5 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={scenarios}>
                    <XAxis dataKey="cr" tick={{fill:'#5a5f72',fontSize:11,fontFamily:'JetBrains Mono'}} axisLine={false} tickLine={false}/>
                    <YAxis hide/>
                    <Tooltip content={<TT/>}/>
                    <ReferenceLine y={0} stroke="#252836" strokeDasharray="3 3"/>
                    <Bar dataKey="profit" name="Прибыль" radius={[4,4,0,0]}>
                      {scenarios.map((d,i) => (
                        <Cell key={i} fill={d.profit >= 0 ? '#00ff9d' : '#ff4757'}/>
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {history.length > 0 && (
              <div className="card">
                <div className="px-5 py-4 border-b border-border font-bold text-sm">История выручки (30 дней)</div>
                <div className="p-5 h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history}>
                      <defs>
                        <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#a78bfa" stopOpacity={.2}/>
                          <stop offset="95%" stopColor="#a78bfa" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="day" tick={{fill:'#5a5f72',fontSize:10,fontFamily:'JetBrains Mono'}} axisLine={false} tickLine={false}/>
                      <YAxis hide/>
                      <Tooltip content={<TT/>}/>
                      <Area type="monotone" dataKey="revenue" name="Выручка" stroke="#a78bfa" strokeWidth={2} fill="url(#gR)" dot={false}/>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
