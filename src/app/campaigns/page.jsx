'use client'
import { useEffect, useState, useCallback } from 'react'
import { Plus, Play, Pause, Trash2, Send, Users, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import { Layout, Topbar } from '@/components/layout/Layout'
import { Modal, FormField, Badge, ProgressBar, Spinner, Empty, useWebSocket } from '@/components/ui'

const STATUS = {
  DRAFT:     { label: 'Черновик',   color: 'purple', hint: 'Кампания создана, но ещё не запущена' },
  RUNNING:   { label: 'Идёт',       color: 'blue',   hint: 'Воркер активно отправляет сообщения' },
  PAUSED:    { label: 'Пауза',      color: 'yellow', hint: 'Рассылка приостановлена' },
  DONE:      { label: 'Завершена',  color: 'green',  hint: 'Все сообщения отправлены' },
  FAILED:    { label: 'Ошибка',     color: 'red',    hint: 'Произошла ошибка при отправке' },
  SCHEDULED: { label: 'Запланир.',  color: 'yellow', hint: 'Запуск запланирован' },
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([])
  const [channels,  setChannels]  = useState([])
  const [accounts,  setAccounts]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [open,      setOpen]      = useState(false)
  const [expanded,  setExpanded]  = useState({})
  const [liveLogs,  setLiveLogs]  = useState({})
  const [form, setForm] = useState({
    name: '', campaignType: 'DM', messageText: '',
    targetChannels: [], senderAccountIds: [],
    maxRecipients: '', delayBetween: 30, offerUrl: '',
  })

  useWebSocket({ onEvent: useCallback((ev, data) => {
    if (ev === 'campaign_progress') {
      setCampaigns(prev => prev.map(c =>
        c.id === data.campaignId ? { ...c, ...data } : c
      ))
      setLiveLogs(prev => ({
        ...prev,
        [data.campaignId]: [
          { time: new Date().toLocaleTimeString('ru'), ...data },
          ...(prev[data.campaignId] || []).slice(0, 49)
        ]
      }))
    }
  }, []) })

  const load = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    const [c, ch, ac] = await Promise.all([
      fetch('/api/campaigns').then(r => r.json()).catch(() => []),
      fetch('/api/channels').then(r => r.json()).catch(() => []),
      fetch('/api/accounts').then(r => r.json()).catch(() => []),
    ])
    setCampaigns(Array.isArray(c) ? c : [])
    setChannels(Array.isArray(ch) ? ch : [])
    setAccounts(Array.isArray(ac) ? ac : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])
  useEffect(() => {
    const t = setInterval(() => load(false), 5000)
    return () => clearInterval(t)
  }, [])

  const handleCreate = async () => {
    if (!form.name || !form.messageText) { toast.error('Заполни название и текст'); return }
    if (form.targetChannels.length === 0) { toast.error('Выбери хотя бы один канал-источник'); return }
    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, maxRecipients: form.maxRecipients ? +form.maxRecipients : null }),
    })
    if (res.ok) { toast.success('Кампания создана'); setOpen(false); load() }
    else toast.error('Ошибка при создании')
  }

  const handleStart = async (id) => {
    await fetch(`/api/campaigns/${id}/start`, { method: 'POST' })
    toast.success('Рассылка запущена! Воркер начнёт отправку в течение 10 сек.')
    setTimeout(() => load(false), 2000)
  }

  const handlePause = async (id) => {
    await fetch(`/api/campaigns/${id}/pause`, { method: 'POST' })
    toast('Поставлено на паузу')
    load(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Удалить кампанию?')) return
    await fetch(`/api/campaigns/${id}`, { method: 'DELETE' })
    toast.success('Удалено')
    load()
  }

  const toggleChannel = (u) => setForm(f => ({
    ...f, targetChannels: f.targetChannels.includes(u)
      ? f.targetChannels.filter(c => c !== u)
      : [...f.targetChannels, u]
  }))

  const toggleExpand = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }))

  return (
    <Layout>
      <Topbar title="Рассылки"
        subtitle={`${campaigns.filter(c => c.status === 'RUNNING').length} активных · ${campaigns.filter(c => c.status === 'DONE').length} завершено`}
        actions={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={14}/> Новая рассылка</button>}/>

      <div className="p-8 space-y-4">

        {/* Инструкция */}
        <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 flex gap-3">
          <Info size={16} className="text-accent mt-0.5 flex-shrink-0"/>
          <div className="text-xs text-muted leading-relaxed">
            <span className="text-[#e8eaf0] font-bold">Как работают рассылки:</span> сначала нужно добавить каналы во вкладке «Каналы» и спарсить участников (кнопка ↓). После этого создай рассылку, выбери каналы-источники и запусти. Воркер будет отправлять сообщения участникам с заданной задержкой. Статус обновляется каждые 5 секунд.
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Spinner/></div>
        ) : campaigns.length === 0 ? (
          <div className="card">
            <Empty icon={Send} text="Рассылок нет"
              action={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={14}/> Создать первую</button>}/>
          </div>
        ) : (
          campaigns.map(camp => {
            const st = STATUS[camp.status] || STATUS.DRAFT
            const pct = camp.maxRecipients ? Math.round((camp.sentCount || 0) / camp.maxRecipients * 100) : 0
            const logs = liveLogs[camp.id] || []
            const isExpanded = expanded[camp.id]

            return (
              <div key={camp.id} className="card overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">

                      {/* Заголовок */}
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-bold text-sm">{camp.name}</span>
                        <Badge color={st.color}>{st.label}</Badge>
                        <span className="text-[10px] font-mono text-muted bg-surface2 px-2 py-0.5 rounded">{camp.campaignType}</span>
                      </div>

                      {/* Текст сообщения */}
                      <p className="text-xs text-muted mb-3 line-clamp-2 bg-surface2 rounded px-3 py-2 font-mono">
                        {camp.messageText || '—'}
                      </p>

                      {/* Статистика */}
                      <div className="grid grid-cols-4 gap-3 mb-3">
                        <div className="bg-surface2 rounded-lg px-3 py-2 text-center">
                          <div className="text-lg font-black text-[#e8eaf0]">{camp.sentCount || 0}</div>
                          <div className="text-[10px] font-mono text-muted uppercase">Отправлено</div>
                        </div>
                        <div className="bg-surface2 rounded-lg px-3 py-2 text-center">
                          <div className="text-lg font-black text-success">{camp.deliveredCount || 0}</div>
                          <div className="text-[10px] font-mono text-muted uppercase">Доставлено</div>
                        </div>
                        <div className="bg-surface2 rounded-lg px-3 py-2 text-center">
                          <div className="text-lg font-black text-danger">{camp.failedCount || 0}</div>
                          <div className="text-[10px] font-mono text-muted uppercase">Ошибок</div>
                        </div>
                        <div className="bg-surface2 rounded-lg px-3 py-2 text-center">
                          <div className="text-lg font-black text-accent">{camp.maxRecipients || '∞'}</div>
                          <div className="text-[10px] font-mono text-muted uppercase">Лимит</div>
                        </div>
                      </div>

                      {/* Прогресс */}
                      {camp.status === 'RUNNING' && camp.maxRecipients && (
                        <div className="mb-3">
                          <div className="flex justify-between text-[10px] font-mono text-muted mb-1">
                            <span>Прогресс отправки</span>
                            <span>{camp.sentCount || 0} / {camp.maxRecipients} ({pct}%)</span>
                          </div>
                          <ProgressBar value={camp.sentCount || 0} max={camp.maxRecipients} color="#00e5ff"/>
                        </div>
                      )}

                      {/* Каналы и аккаунты */}
                      <div className="flex gap-4 text-[10px] font-mono text-muted">
                        {camp.targetChannels?.length > 0 && (
                          <span>📡 Источники: {camp.targetChannels.slice(0,3).map(c => `@${c}`).join(', ')}{camp.targetChannels.length > 3 ? ` +${camp.targetChannels.length - 3}` : ''}</span>
                        )}
                        <span>⏱ Задержка: {camp.delayBetween}с</span>
                      </div>
                    </div>

                    {/* Кнопки */}
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      {(camp.status === 'DRAFT' || camp.status === 'PAUSED') && (
                        <button className="btn-primary text-xs px-4 py-2" onClick={() => handleStart(camp.id)}>
                          <Play size={12}/> Запустить
                        </button>
                      )}
                      {camp.status === 'RUNNING' && (
                        <button className="btn-ghost text-xs px-4 py-2" onClick={() => handlePause(camp.id)}>
                          <Pause size={12}/> Пауза
                        </button>
                      )}
                      <button className="btn-ghost text-xs px-4 py-2 hover:border-danger hover:text-danger"
                        onClick={() => handleDelete(camp.id)}>
                        <Trash2 size={12}/> Удалить
                      </button>
                      <button className="btn-ghost text-xs px-4 py-2" onClick={() => toggleExpand(camp.id)}>
                        {isExpanded ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                        Логи
                      </button>
                    </div>
                  </div>
                </div>

                {/* Живой лог */}
                {isExpanded && (
                  <div className="border-t border-border bg-[#0a0b0f] p-4">
                    <div className="text-[10px] font-mono text-muted uppercase tracking-widest mb-3 flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${camp.status === 'RUNNING' ? 'bg-success animate-pulse' : 'bg-muted'}`}/>
                      Лог отправки
                      {camp.status === 'RUNNING' && <span className="text-success">● Обновляется автоматически</span>}
                    </div>
                    {logs.length === 0 ? (
                      <div className="text-xs font-mono text-muted text-center py-4">
                        {camp.status === 'RUNNING'
                          ? 'Ожидаем первые события от воркера...'
                          : camp.status === 'DRAFT'
                          ? 'Запусти рассылку чтобы увидеть логи'
                          : 'Логи недоступны для завершённых кампаний'}
                      </div>
                    ) : (
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {logs.map((log, i) => (
                          <div key={i} className="flex items-center gap-3 text-[11px] font-mono">
                            <span className="text-muted">{log.time}</span>
                            {log.status === 'sent' && <CheckCircle2 size={11} className="text-success"/>}
                            {log.status === 'failed' && <XCircle size={11} className="text-danger"/>}
                            {log.status === 'waiting' && <Clock size={11} className="text-yellow-400"/>}
                            <span className={log.status === 'sent' ? 'text-success' : log.status === 'failed' ? 'text-danger' : 'text-muted'}>
                              {log.message || `Отправлено: ${log.sent}, Ошибок: ${log.failed}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 pt-3 border-t border-border/50 text-[10px] font-mono text-muted">
                      💡 Логи в реальном времени приходят через WebSocket. Исторические логи хранятся в БД.
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Новая рассылка" wide>
        <div className="text-xs text-muted bg-surface2 rounded-lg px-3 py-2 mb-4 flex gap-2">
          <Info size={13} className="flex-shrink-0 mt-0.5"/>
          Убедись что у тебя есть активный аккаунт и спарсенные каналы. Без участников в БД рассылка не отправит ни одного сообщения.
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FormField label="Название кампании">
              <input className="input" placeholder="Крипта оффер #1" value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}/>
            </FormField>
            <FormField label="Тип рассылки">
              <select className="input" value={form.campaignType} onChange={e => setForm({...form, campaignType: e.target.value})}>
                <option value="DM">💬 Личные сообщения (DM)</option>
                <option value="COMMENT">💭 Комментарии к постам</option>
                <option value="INVITE">👥 Инвайтинг в группу</option>
                <option value="POST">📢 Постинг в канал</option>
              </select>
            </FormField>
            <FormField label="Текст сообщения">
              <textarea className="input resize-none h-28" placeholder="Привет! Хочу предложить..." value={form.messageText}
                onChange={e => setForm({...form, messageText: e.target.value})}/>
              <div className="text-[10px] font-mono text-muted mt-1">{form.messageText.length} символов</div>
            </FormField>
            <FormField label="URL оффера (необязательно)">
              <input className="input" placeholder="https://..." value={form.offerUrl}
                onChange={e => setForm({...form, offerUrl: e.target.value})}/>
            </FormField>
          </div>
          <div>
            <FormField label={`Каналы-источники участников (${form.targetChannels.length} выбрано)`}>
              {channels.length === 0 ? (
                <div className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg p-3">
                  ⚠️ Нет каналов! Сначала добавь каналы во вкладке «Каналы» и спарси участников.
                </div>
              ) : (
                <div className="border border-border rounded-lg max-h-44 overflow-y-auto divide-y divide-border">
                  {channels.map(ch => (
                    <label key={ch.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-surface2">
                      <input type="checkbox" className="accent-accent"
                        checked={form.targetChannels.includes(ch.username)}
                        onChange={() => toggleChannel(ch.username)}/>
                      <span className="text-xs font-mono">@{ch.username}</span>
                      {ch.subscribers && <span className="text-[10px] text-muted ml-auto">{(ch.subscribers/1000).toFixed(0)}K</span>}
                      {ch.parsedCount > 0 && <span className="text-[10px] text-success">{ch.parsedCount} польз.</span>}
                    </label>
                  ))}
                </div>
              )}
            </FormField>
            <FormField label="Аккаунт-отправитель">
              <select className="input" value={form.senderAccountIds[0] || ''}
                onChange={e => setForm({...form, senderAccountIds: e.target.value ? [+e.target.value] : []})}>
                <option value="">Авто (ротация всех активных)</option>
                {accounts.filter(a => a.status === 'ACTIVE').map(a => (
                  <option key={a.id} value={a.id}>{a.username ? `@${a.username}` : a.phone} — {a.sentToday}/{a.dailyLimit}/д</option>
                ))}
              </select>
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Макс. получателей">
                <input className="input" type="number" placeholder="Все" value={form.maxRecipients}
                  onChange={e => setForm({...form, maxRecipients: e.target.value})}/>
              </FormField>
              <FormField label="Задержка сек.">
                <input className="input" type="number" value={form.delayBetween}
                  onChange={e => setForm({...form, delayBetween: +e.target.value})}/>
                <div className="text-[10px] font-mono text-muted mt-1">Рекомендуем 20-60с</div>
              </FormField>
            </div>
          </div>
        </div>
        <button className="btn-primary w-full justify-center mt-2" onClick={handleCreate}>
          <Send size={14}/> Создать рассылку
        </button>
      </Modal>
    </Layout>
  )
}
