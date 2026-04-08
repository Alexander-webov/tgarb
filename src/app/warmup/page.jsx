'use client'
// src/app/warmup/page.jsx
import { useEffect, useState, useCallback } from 'react'
import { Flame, CheckCircle2, AlertTriangle, WifiOff, RefreshCw, Settings, Play } from 'lucide-react'
import toast from 'react-hot-toast'
import { Layout, Topbar } from '@/components/layout/Layout'
import { Badge, ProgressBar, Modal, Spinner, Empty, useWebSocket } from '@/components/ui'

const STATUS_META = {
  ACTIVE:  { label:'Активен', color:'green',  icon:CheckCircle2 },
  WARMING: { label:'Прогрев', color:'yellow', icon:Flame        },
  LIMITED: { label:'Лимит',   color:'yellow', icon:AlertTriangle},
  BANNED:  { label:'Бан',     color:'red',    icon:WifiOff      },
  OFFLINE: { label:'Офлайн',  color:'purple', icon:WifiOff      },
}
const NICHES = [
  {id:'crypto',color:'#00e5ff',label:'₿ Крипта'},
  {id:'gambling',color:'#ff6b35',label:'🎰 Гемблинг'},
  {id:'arbitrage',color:'#00ff9d',label:'📊 Арбитраж'},
  {id:'finance',color:'#ffd32a',label:'💰 Финансы'},
  {id:'nutra',color:'#a78bfa',label:'💊 Нутра'},
  {id:'general',color:'#5a5f72',label:'🌐 Общее'},
]

export default function Warmup() {
  const [stats,      setStats]      = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [running,    setRunning]    = useState(false)
  const [nicheModal, setNicheModal] = useState(null)
  const [nicheChans, setNicheChans] = useState({})
  const [liveMap,    setLiveMap]    = useState({})

  useWebSocket({ onEvent: useCallback((ev, data) => {
    if (ev === 'warmup_progress') {
      setLiveMap(p => ({...p, [data.accountId]: data}))
      setTimeout(() => load(false), 1500)
    }
  }, []) })

  const load = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    const [s, nc] = await Promise.all([
      fetch('/api/warmup/stats').then(r=>r.json()).catch(()=>null),
      fetch('/api/warmup/niche-channels').then(r=>r.json()).catch(()=>({})),
    ])
    setStats(s); setNicheChans(nc); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const handleStart = async (id) => {
    await fetch(`/api/warmup/${id}/start`, {method:'POST'})
    toast.success('Шаг запущен')
  }
  const handleCycle = async () => {
    setRunning(true)
    await fetch('/api/warmup/run-cycle', {method:'POST'})
    toast.success('Цикл прогрева запущен')
    setTimeout(() => { setRunning(false); load() }, 3000)
  }
  const handleSetNiche = async (niche) => {
    if (!nicheModal) return
    await fetch(`/api/warmup/${nicheModal.id}/niche`, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({niche})})
    toast.success(`Ниша ${niche} установлена`)
    setNicheModal(null); load()
  }

  const timeline = stats?.warmupTimeline || []

  return (
    <Layout>
      <Topbar title="Прогрев аккаунтов" subtitle={`${stats?.active??0} готовы · ${stats?.warming??0} в прогреве`}
        actions={
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => load()}><RefreshCw size={14}/></button>
            <button className="btn-primary" onClick={handleCycle} disabled={running}>
              <Flame size={14} className={running?'animate-pulse':''}/>{running?'Запущено...':'Прогреть всех'}
            </button>
          </div>
        }/>
      <div className="p-8 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-5 gap-4">
          {[
            {label:'Всего',    value:stats?.total??'—',   color:'#5a5f72'},
            {label:'Активных', value:stats?.active??0,    color:'#00ff9d'},
            {label:'Прогрев',  value:stats?.warming??0,   color:'#ffd32a'},
            {label:'Лимит',    value:stats?.limited??0,   color:'#ff6b35'},
            {label:'Бан',      value:stats?.banned??0,    color:'#ff4757'},
          ].map(s => (
            <div key={s.label} className="card p-4">
              <div className="absolute top-0 right-0 w-12 h-12 rounded-bl-full opacity-10" style={{background:s.color}}/>
              <div className="text-[10px] font-mono text-muted uppercase tracking-wider mb-1">{s.label}</div>
              <div className="text-3xl font-black" style={{color:s.color}}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-2 card overflow-hidden">
            <div className="px-5 py-4 border-b border-border font-bold text-sm">Аккаунты</div>
            {loading ? <div className="flex justify-center py-12"><Spinner/></div>
            : timeline.length === 0 ? <Empty icon={WifiOff} text="Нет аккаунтов"/>
            : (
              <table className="w-full">
                <thead><tr className="border-b border-border">
                  {['Аккаунт','Статус','Прогрев','Лимит','Готов',''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-muted uppercase tracking-wider">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-border">
                  {timeline.map(acc => {
                    const st   = STATUS_META[acc.status] || STATUS_META.OFFLINE
                    const live = liveMap[acc.id]
                    const day  = live?.day ?? acc.day
                    const col  = day >= 5 ? '#00ff9d' : day >= 3 ? '#ffd32a' : '#00e5ff'
                    return (
                      <tr key={acc.id} className={`hover:bg-surface2/40 transition-colors ${live?'bg-accent/3':''}`}>
                        <td className="px-4 py-3">
                          <div className="font-bold text-sm">{acc.username?`@${acc.username}`:acc.phone}</div>
                          {live && <div className="text-[10px] font-mono text-accent flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-accent pulse-dot inline-block"/>Прогрев...</div>}
                        </td>
                        <td className="px-4 py-3"><Badge color={st.color}>{st.label}</Badge></td>
                        <td className="px-4 py-3">
                          <div className="w-28">
                            <div className="flex justify-between text-[10px] font-mono text-muted mb-1"><span>День {day}/5</span><span className="text-accent">{day}/5</span></div>
                            <div className="h-1.5 bg-border rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{width:`${Math.min(100,day/5*100)}%`,background:col}}/>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono">{acc.sentToday}/{acc.dailyLimit}</td>
                        <td className="px-4 py-3"><Badge color={acc.isWarmed?'green':'purple'}>{acc.isWarmed?'✓':'Нет'}</Badge></td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5">
                            {acc.status === 'WARMING' ? (
                              <>
                                <button className="btn-ghost text-xs px-2 py-1 text-danger border-danger/30"
                                  onClick={() => handleToggleWarmup(acc.id, false)} title="Остановить прогрев">
                                  ⏹ Стоп
                                </button>
                                <button className="btn-ghost text-xs px-2 py-1" onClick={() => handleStart(acc.id)} title="Один шаг">
                                  <Play size={11}/> Шаг
                                </button>
                              </>
                            ) : acc.status !== 'BANNED' ? (
                              <button className="btn-primary text-xs px-2 py-1"
                                onClick={() => handleToggleWarmup(acc.id, true)} title="Запустить прогрев">
                                🔥 Старт
                              </button>
                            ) : null}
                            <button className="btn-ghost text-xs px-2 py-1" onClick={() => setNicheModal(acc)}><Settings size={11}/></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="space-y-4">
            <div className="card p-4">
              <div className="text-sm font-bold mb-3">Авто-подписка по нишам</div>
              <div className="space-y-2">
                {NICHES.map(n => (
                  <div key={n.id} className="flex items-center justify-between bg-surface2 rounded-lg px-3 py-2">
                    <span className="text-xs font-bold" style={{color:n.color}}>{n.label}</span>
                    <span className="text-[10px] font-mono text-muted">{nicheChans[n.id]?.count??0} каналов</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card p-4">
              <div className="text-sm font-bold mb-3">Антибан правила</div>
              <div className="space-y-1.5">
                {['Макс. 5 подписок/день','Рандомные задержки 8-25 сек','SpamBot-проверка каждые 3 дня','Авто-замена при бане'].map(r => (
                  <div key={r} className="flex items-center gap-2 text-xs">
                    <CheckCircle2 size={12} className="text-success"/><span>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal open={!!nicheModal} onClose={() => setNicheModal(null)} title={`Ниша аккаунта ${nicheModal?.phone}`}>
        <p className="text-xs text-muted mb-4">Аккаунт подписывается на каналы этой ниши при прогреве.</p>
        <div className="grid grid-cols-2 gap-2">
          {NICHES.map(n => (
            <button key={n.id} onClick={() => handleSetNiche(n.id)}
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-border bg-surface2 hover:border-accent/30 transition-all text-left">
              <span className="w-2 h-2 rounded-full" style={{background:n.color}}/>
              <div>
                <div className="text-sm font-bold">{n.label}</div>
                <div className="text-[10px] font-mono text-muted">{nicheChans[n.id]?.count??0} каналов</div>
              </div>
            </button>
          ))}
        </div>
      </Modal>
    </Layout>
  )
}
