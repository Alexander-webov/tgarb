'use client'
import { useEffect, useState, useCallback } from 'react'
import { Flame, CheckCircle2, AlertTriangle, WifiOff, RefreshCw, Settings, Play, Info, Shield, Clock, TrendingUp } from 'lucide-react'
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
  {id:'crypto',    color:'#00e5ff', label:'₿ Крипта'},
  {id:'gambling',  color:'#ff6b35', label:'🎰 Гемблинг'},
  {id:'arbitrage', color:'#00ff9d', label:'📊 Арбитраж'},
  {id:'finance',   color:'#ffd32a', label:'💰 Финансы'},
  {id:'nutra',     color:'#a78bfa', label:'💊 Нутра'},
  {id:'general',   color:'#5a5f72', label:'🌐 Общее'},
]

const WARMUP_PLAN = [
  { day: 0, reads: '5-10', reactions: 0,   subs: 3, chats: false, desc: 'Первый день — только чтение каналов и подписки' },
  { day: 1, reads: '8-15', reactions: '1-3', subs: 2, chats: false, desc: 'Второй день — добавляем реакции на посты' },
  { day: 2, reads: '10-20', reactions: '2-5', subs: 2, chats: false, desc: 'Третий день — активнее реагируем' },
  { day: 3, reads: '10-15', reactions: '3-6', subs: 1, chats: true, desc: 'Четвёртый день — начинаем писать в чатах' },
  { day: 4, reads: '8-12', reactions: '2-4', subs: 1, chats: true, desc: 'Пятый день — аккаунт готов к работе!' },
]

export default function Warmup() {
  const [stats,      setStats]      = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [running,    setRunning]    = useState(false)
  const [nicheModal, setNicheModal] = useState(null)
  const [nicheChans, setNicheChans] = useState({})
  const [liveMap,    setLiveMap]    = useState({})
  const [showPlan,   setShowPlan]   = useState(false)

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
    await fetch(`/api/warmup/${id}/start`, { method: 'POST' })
    toast.success('Шаг прогрева запущен! Воркер выполнит через ~10 сек.')
  }

  const handleCycle = async () => {
    setRunning(true)
    await fetch('/api/warmup/run-cycle', { method: 'POST' })
    toast.success('Цикл прогрева запущен для всех аккаунтов')
    setTimeout(() => { setRunning(false); load(false) }, 3000)
  }

  const handleSetNiche = async (niche) => {
    if (!nicheModal) return
    await fetch(`/api/warmup/${nicheModal.id}/niche`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ niche }),
    })
    toast.success(`Ниша установлена: ${niche}`)
    setNicheModal(null)
    load(false)
  }

  return (
    <Layout>
      <Topbar title="Прогрев аккаунтов"
        subtitle={`${stats?.active || 0} готовых · ${stats?.warming || 0} в прогреве`}
        actions={
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => setShowPlan(true)}>
              <Info size={14}/> План прогрева
            </button>
            <button className="btn-ghost" onClick={() => load(false)}>
              <RefreshCw size={14}/>
            </button>
            <button className="btn-primary" onClick={handleCycle} disabled={running}>
              <Flame size={14}/> {running ? 'Запускаем...' : 'Прогреть всех'}
            </button>
          </div>
        }/>

      <div className="p-8 space-y-6">

        {/* Инструкция */}
        <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 flex gap-3">
          <Info size={16} className="text-accent mt-0.5 flex-shrink-0"/>
          <div className="text-xs text-muted leading-relaxed">
            <span className="text-[#e8eaf0] font-bold">Зачем прогревать аккаунт?</span> Новый аккаунт Telegram сразу заблокируют за рассылку. Прогрев имитирует поведение живого человека — подписки, чтение, реакции. После 5 дней прогрева аккаунт помечается как <span className="text-success">«Готов»</span> и доступен для рассылок. Нажми «Шаг» вручную или «Прогреть всех» для автозапуска. Воркер также запускает цикл каждые 2 часа автоматически.
          </div>
        </div>

        {/* Статистика */}
        {stats && (
          <div className="grid grid-cols-5 gap-4">
            {[
              { label: 'Всего',    val: stats.total,   color: '#e8eaf0' },
              { label: 'Активных', val: stats.active,  color: '#00ff9d' },
              { label: 'Прогрев',  val: stats.warming, color: '#ffd32a' },
              { label: 'Лимит',    val: stats.limited, color: '#ff6b35' },
              { label: 'Бан',      val: stats.banned,  color: '#ff4757' },
            ].map(s => (
              <div key={s.label} className="card p-4 text-center">
                <div className="text-3xl font-black mb-1" style={{ color: s.color }}>{s.val}</div>
                <div className="text-[10px] font-mono text-muted uppercase tracking-widest">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Таблица аккаунтов */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <span className="text-sm font-bold">Аккаунты</span>
            <span className="text-[10px] font-mono text-muted">Обновляется в реальном времени через WebSocket</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Spinner/></div>
          ) : !stats?.warmupTimeline?.length ? (
            <Empty icon={WifiOff} text="Нет аккаунтов для прогрева. Добавь аккаунт на вкладке Аккаунты."/>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 text-[10px] font-mono text-muted uppercase">Аккаунт</th>
                  <th className="text-left px-4 py-3 text-[10px] font-mono text-muted uppercase">Статус</th>
                  <th className="text-left px-4 py-3 text-[10px] font-mono text-muted uppercase">Прогрев (день)</th>
                  <th className="text-left px-4 py-3 text-[10px] font-mono text-muted uppercase">Лимит сегодня</th>
                  <th className="text-left px-4 py-3 text-[10px] font-mono text-muted uppercase">Готов к работе</th>
                  <th className="text-left px-4 py-3 text-[10px] font-mono text-muted uppercase">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats.warmupTimeline.map(acc => {
                  const sm = STATUS_META[acc.status] || STATUS_META.OFFLINE
                  const live = liveMap[acc.id]
                  const niche = NICHES.find(n => n.id === acc.niche) || NICHES[5]
                  const dayPct = Math.min((acc.day / 5) * 100, 100)
                  const isReady = acc.isWarmed || acc.day >= 5

                  return (
                    <tr key={acc.id} className="hover:bg-surface2/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-bold text-sm">{acc.username ? `@${acc.username}` : acc.phone}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full text-white/80"
                            style={{ background: niche.color + '33', border: `1px solid ${niche.color}44` }}>
                            {niche.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Badge color={sm.color}>{sm.label}</Badge>
                        {live && (
                          <div className="text-[10px] font-mono text-accent mt-1 animate-pulse">
                            ● {live.action || 'работает...'}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-xs font-mono text-muted mb-1.5">День {acc.day} / 5</div>
                        <div className="w-32">
                          <ProgressBar value={acc.day} max={5} color="#00e5ff" className="h-1.5"/>
                        </div>
                        <div className="text-[10px] font-mono text-muted mt-1">
                          {WARMUP_PLAN[Math.min(acc.day, 4)]?.desc?.slice(0, 30)}...
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-xs font-mono">{acc.sentToday} / {acc.dailyLimit}</div>
                        <ProgressBar value={acc.sentToday} max={acc.dailyLimit}
                          color={acc.sentToday >= acc.dailyLimit ? '#ff4757' : '#00ff9d'} className="w-24 mt-1"/>
                      </td>
                      <td className="px-4 py-4">
                        {isReady ? (
                          <div className="flex items-center gap-1.5 text-success text-xs font-bold">
                            <CheckCircle2 size={14}/> Готов
                          </div>
                        ) : (
                          <div className="text-xs text-muted">
                            <Clock size={12} className="inline mr-1"/>
                            Осталось {5 - acc.day} дн.
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <button className="btn-ghost text-xs px-3 py-1.5" onClick={() => handleStart(acc.id)}
                            title="Выполнить один шаг прогрева прямо сейчас">
                            <Play size={11}/> Шаг
                          </button>
                          <button className="btn-ghost text-xs px-3 py-1.5" onClick={() => setNicheModal(acc)}
                            title="Выбрать нишу для прогрева">
                            <Settings size={11}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Авто-подписка по нишам */}
        {Object.keys(nicheChans).length > 0 && (
          <div className="card p-5">
            <div className="text-sm font-bold mb-4">Авто-подписка по нишам</div>
            <div className="grid grid-cols-3 gap-3">
              {NICHES.map(n => (
                <div key={n.id} className="bg-surface2 rounded-xl p-3 flex items-center justify-between">
                  <span className="text-sm">{n.label}</span>
                  <span className="text-[10px] font-mono text-muted">
                    {nicheChans[n.id]?.length || 0} каналов
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Антибан правила */}
        <div className="card p-5">
          <div className="text-sm font-bold mb-4 flex items-center gap-2">
            <Shield size={14} className="text-success"/>
            Антибан правила
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: '✅', text: 'Макс. 5 подписок/день в первые дни' },
              { icon: '✅', text: 'Рандомные задержки 8-25 сек между действиями' },
              { icon: '✅', text: 'SpamBot-проверка каждые 3 дня' },
              { icon: '✅', text: 'Авто-замена аккаунта при обнаружении бана' },
              { icon: '✅', text: 'Имитация чтения перед реакциями' },
              { icon: '✅', text: 'Плавное наращивание активности' },
            ].map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-muted">
                <span>{r.icon}</span> {r.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Модал выбора ниши */}
      <Modal open={!!nicheModal} onClose={() => setNicheModal(null)} title={`Ниша для ${nicheModal?.phone}`}>
        <div className="text-xs text-muted mb-4">
          Ниша определяет на какие каналы подписывается аккаунт во время прогрева. Выбирай ту же нишу что и твоя целевая аудитория.
        </div>
        <div className="grid grid-cols-2 gap-3">
          {NICHES.map(n => (
            <button key={n.id} className="card p-4 text-left hover:border-accent/30 transition-colors"
              onClick={() => handleSetNiche(n.id)}>
              <div className="text-lg mb-1">{n.label}</div>
              <div className="text-[10px] font-mono text-muted">
                {nicheChans[n.id]?.length || 0} каналов для подписки
              </div>
            </button>
          ))}
        </div>
      </Modal>

      {/* Модал плана прогрева */}
      <Modal open={showPlan} onClose={() => setShowPlan(false)} title="5-дневный план прогрева">
        <div className="space-y-3">
          {WARMUP_PLAN.map((p, i) => (
            <div key={i} className="bg-surface2 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-7 h-7 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-black">
                  {i + 1}
                </div>
                <div className="font-bold text-sm">День {i + 1}</div>
                {i === 4 && <Badge color="green">Готов к работе!</Badge>}
              </div>
              <div className="text-xs text-muted mb-2">{p.desc}</div>
              <div className="grid grid-cols-4 gap-2 text-[10px] font-mono">
                <div className="bg-surface rounded px-2 py-1">
                  <div className="text-muted">Чтений</div>
                  <div className="text-[#e8eaf0] font-bold">{p.reads}</div>
                </div>
                <div className="bg-surface rounded px-2 py-1">
                  <div className="text-muted">Реакций</div>
                  <div className="text-[#e8eaf0] font-bold">{p.reactions || '—'}</div>
                </div>
                <div className="bg-surface rounded px-2 py-1">
                  <div className="text-muted">Подписок</div>
                  <div className="text-[#e8eaf0] font-bold">{p.subs}</div>
                </div>
                <div className="bg-surface rounded px-2 py-1">
                  <div className="text-muted">Чаты</div>
                  <div className={p.chats ? 'text-success font-bold' : 'text-muted font-bold'}>{p.chats ? 'Да' : 'Нет'}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </Layout>
  )
}
