'use client'
import { useEffect, useState, useCallback } from 'react'
import { Plus, Trash2, Download, Search, Radio, Info, RefreshCw, Users, CheckCircle2, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { Layout, Topbar } from '@/components/layout/Layout'
import { Modal, FormField, Badge, Toggle, Spinner, Empty, useWebSocket } from '@/components/ui'
import { checkAccount } from '@/lib/accountCheck'

const CAT_COLOR = { crypto:'blue', gambling:'red', arbitrage:'green', finance:'yellow', other:'purple' }
const CAT_LABELS = { crypto:'Крипта', gambling:'Гемблинг', arbitrage:'Арбитраж', finance:'Финансы', other:'Другое' }

export default function ChannelsPage() {
  const [channels,  setChannels]  = useState([])
  const [accounts,  setAccounts]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [open,      setOpen]      = useState(false)
  const [search,    setSearch]    = useState('')
  const [parsing,   setParsing]   = useState({})
  const [fetching,  setFetching]  = useState({})
  const [errors,    setErrors]    = useState({})
  const [filterOpen, setFilterOpen] = useState(null) // channelId
  const [filterOpts, setFilterOpts] = useState({ hasAvatar: 'any', minDaysOnline: '', sex: 'any' })
  const [filterCount, setFilterCount] = useState(null)
  const [form,      setForm]      = useState({ username:'', category:'', isMonitored:true, isParsing:false })

  useWebSocket({ onEvent: useCallback((ev, data) => {
    if (ev === 'parse_done') {
      setParsing(p => ({ ...p, [data.channelId]: false }))
      toast.success(`Спарсено ${data.count} участников из @${data.username}`)
      load(false)
    }
    if (ev === 'channel_updated') {
      load(false)
    }
  }, []) })

  const load = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    const [ch, ac] = await Promise.all([
      fetch('/api/channels').then(r=>r.json()).catch(()=>[]),
      fetch('/api/accounts').then(r=>r.json()).catch(()=>[]),
    ])
    setChannels(Array.isArray(ch) ? ch : [])
    setAccounts(Array.isArray(ac) ? ac : [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const handleAdd = async () => {
    if (!form.username) { toast.error('Введи username канала'); return }
    const res = await fetch('/api/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    if (res.ok) {
      toast.success('Канал добавлен! Нажми 🔄 чтобы подтянуть данные.')
      setOpen(false)
      setForm({ username:'', category:'', isMonitored:true, isParsing:false })
      load()
    } else toast.error('Ошибка добавления')
  }

  const handleToggle = async (id, field, value) => {
    await fetch(`/api/channels/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    })
    toast.success(field === 'isMonitored'
      ? (value ? 'Мониторинг включён' : 'Мониторинг выключен')
      : (value ? 'Парсинг включён' : 'Парсинг выключен'))
    load(false)
  }

  const handleParse = async (id, username) => {
    const check = checkAccount(accounts)
    if (!check.ok) {
      setErrors(p => ({ ...p, [id]: check.error }))
      toast.error(check.error, { duration: 6000 })
      return
    }
    setErrors(p => ({ ...p, [id]: null }))
    setParsing(p => ({ ...p, [id]: true }))
    const res = await fetch(`/api/channels/${id}/parse-members?account_id=${check.account.id}&limit=5000`, { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      toast.success(data.message || `Парсинг @${username} запущен — займёт 1-5 минут`)
    } else {
      const errMsg = data.error || 'Ошибка парсинга'
      setErrors(p => ({ ...p, [id]: errMsg }))
      toast.error(errMsg, { duration: 8000 })
      setParsing(p => ({ ...p, [id]: false }))
    }
  }

  const handleFetchInfo = async (id, username) => {
    const check = checkAccount(accounts)
    if (!check.ok) {
      setErrors(p => ({ ...p, [id]: check.error }))
      toast.error(check.error, { duration: 6000 })
      return
    }
    setErrors(p => ({ ...p, [id]: null }))
    setFetching(p => ({ ...p, [id]: true }))
    try {
      const res = await fetch(`/api/channels/${id}/fetch-info?account_id=${check.account.id}`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        toast.success(`@${username}: ${data.subscribers ? (data.subscribers/1000).toFixed(0)+'K подписчиков' : 'данные обновлены'}`)
        load(false)
      } else {
        const errMsg = data.error || 'не удалось получить данные'
        setErrors(p => ({ ...p, [id]: errMsg }))
        toast.error(errMsg, { duration: 8000 })
      }
    } catch (e) {
      setErrors(p => ({ ...p, [id]: e.message }))
      toast.error('Ошибка: ' + e.message)
    }
    setFetching(p => ({ ...p, [id]: false }))
  }

  const handleDelete = async (id) => {
    if (!confirm('Удалить канал и всех спарсенных участников?')) return
    await fetch(`/api/channels/${id}`, { method: 'DELETE' })
    toast.success('Удалён')
    load()
  }

  const filtered = channels.filter(c =>
    !search || c.username.includes(search.replace('@','')) || (c.title||'').toLowerCase().includes(search.toLowerCase())
  )

  const accCheck = checkAccount(accounts)
  const activeAcc = accCheck.ok ? accCheck.account : null

  return (
    <Layout>
      <Topbar title="Каналы"
        subtitle={`${channels.length} каналов · ${channels.reduce((s,c) => s + (c.parsedCount||0), 0).toLocaleString()} участников в БД`}
        actions={
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => load(false)}><RefreshCw size={14}/></button>
            <button className="btn-primary" onClick={() => setOpen(true)}><Plus size={14}/> Добавить</button>
          </div>
        }/>

      <div className="p-8 space-y-4">

        {/* Инструкция */}
        <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 flex gap-3">
          <Info size={16} className="text-accent mt-0.5 flex-shrink-0"/>
          <div className="text-xs text-muted leading-relaxed space-y-1">
            <div><span className="text-[#e8eaf0] font-bold">Как работают каналы:</span></div>
            <div><span className="text-[#e8eaf0]">1. Добавь канал</span> — введи @username и нажми «Добавить»</div>
            <div><span className="text-[#e8eaf0]">2. Обнови данные</span> — нажми 🔄 чтобы подтянуть подписчиков, ER, посты (требует активный аккаунт)</div>
            <div><span className="text-[#e8eaf0]">3. Спарси участников</span> — нажми ↓ чтобы собрать список участников для рассылки</div>
            <div><span className="text-[#e8eaf0]">Монитор</span> — включает автообновление данных раз в 2 часа. <span className="text-[#e8eaf0]">Парсинг</span> — автоматически парсит новых участников.</div>
            {!activeAcc && <div className="text-danger font-bold mt-1">⚠️ {accCheck.error}</div>}
          </div>
        </div>

        {/* Поиск */}
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"/>
          <input className="input pl-9" placeholder="Поиск по username..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>

        {/* Таблица */}
        {loading ? (
          <div className="flex justify-center py-16"><Spinner/></div>
        ) : filtered.length === 0 ? (
          <div className="card">
            <Empty icon={Radio} text="Нет каналов"
              action={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={14}/> Добавить первый</button>}/>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-[10px] font-mono text-muted uppercase">Канал</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono text-muted uppercase">Категория</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono text-muted uppercase">Подписчики</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono text-muted uppercase">ER</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono text-muted uppercase">Постов/д</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono text-muted uppercase" title="Автообновление данных раз в 2 часа">Монитор ⓘ</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono text-muted uppercase" title="Автопарсинг новых участников">Парсинг ⓘ</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono text-muted uppercase">Участники в БД</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono text-muted uppercase">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(ch => (
                  <tr key={ch.id} className="hover:bg-surface2/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center text-xs font-black">
                          {ch.username[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-semibold">@{ch.username}</div>
                          {ch.title && <div className="text-[10px] font-mono text-muted">{ch.title}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {ch.category
                        ? <Badge color={CAT_COLOR[ch.category]||'purple'}>{CAT_LABELS[ch.category]||ch.category}</Badge>
                        : <span className="text-xs text-muted">—</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {ch.subscribers
                        ? <span className="text-[#e8eaf0]">{ch.subscribers >= 1000 ? `${(ch.subscribers/1000).toFixed(0)}K` : ch.subscribers}</span>
                        : <span className="text-muted" title="Нажми 🔄 чтобы обновить">—</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {ch.erPercent != null
                        ? <span className="text-success">{ch.erPercent}%</span>
                        : <span className="text-muted">—</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {ch.postsPerDay != null
                        ? <span className="text-accent">{ch.postsPerDay}/д</span>
                        : <span className="text-muted">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <Toggle checked={ch.isMonitored} onChange={v=>handleToggle(ch.id,'isMonitored',v)}/>
                        <div className="text-[9px] font-mono text-muted mt-1">{ch.isMonitored ? 'Включён' : 'Выключен'}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <Toggle checked={ch.isParsing} onChange={v=>handleToggle(ch.id,'isParsing',v)}/>
                        <div className="text-[9px] font-mono text-muted mt-1">{ch.isParsing ? 'Включён' : 'Выключен'}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {(ch.parsedCount > 0)
                        ? <div className="flex items-center gap-1 text-success text-xs font-mono">
                            <Users size={11}/> {ch.parsedCount.toLocaleString()}
                          </div>
                        : <div className="text-xs text-muted" title="Нажми ↓ чтобы спарсить участников">
                            0 <span className="text-[10px]">(нажми ↓)</span>
                          </div>}
                      {parsing[ch.id] && (
                        <div className="text-[10px] font-mono text-yellow-400 mt-1 animate-pulse">
                          <Clock size={9} className="inline"/> Парсим...
                        </div>
                      )}
                      {errors[ch.id] && (
                        <div className="text-[10px] font-mono text-danger mt-1 leading-tight">
                          ⚠️ {errors[ch.id]}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          className="btn-ghost text-xs px-2 py-1.5"
                          onClick={() => handleFetchInfo(ch.id, ch.username)}
                          disabled={fetching[ch.id]}
                          title="Обновить данные канала (подписчики, ER, посты)">
                          {fetching[ch.id] ? <RefreshCw size={12} className="animate-spin"/> : '🔄'}
                        </button>
                        <button
                          className={`btn-ghost text-xs px-2 py-1.5 ${parsing[ch.id] ? 'opacity-50' : ''}`}
                          onClick={() => handleParse(ch.id, ch.username)}
                          disabled={parsing[ch.id]}
                          title="Спарсить участников канала (нужен активный аккаунт)">
                          {parsing[ch.id] ? <Clock size={12}/> : <Download size={12}/>}
                        </button>
                        {(ch.parsedCount||0) > 0 && (
                          <button className="btn-ghost text-xs px-2 py-1.5" title="Фильтры базы"
                            onClick={()=>setFilterOpen(ch.id)}>🔍</button>
                        )}
                        <button
                          className="btn-ghost text-xs px-2 py-1.5 hover:border-danger hover:text-danger"
                          onClick={() => handleDelete(ch.id)}
                          title="Удалить канал">
                          <Trash2 size={12}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Добавить канал">
        <div className="text-xs text-muted bg-surface2 rounded-lg px-3 py-2 mb-4 flex gap-2">
          <Info size={13} className="flex-shrink-0 mt-0.5"/>
          После добавления нажми 🔄 чтобы подтянуть данные канала, и ↓ чтобы спарсить участников для рассылки.
        </div>
        <FormField label="Username канала">
          <input className="input" placeholder="@cryptowhales или cryptowhales" value={form.username}
            onChange={e=>setForm({...form, username: e.target.value.replace('@','')})}/>
        </FormField>
        <FormField label="Категория">
          <select className="input" value={form.category} onChange={e=>setForm({...form, category:e.target.value})}>
            <option value="">— выбрать —</option>
            <option value="crypto">₿ Крипта</option>
            <option value="gambling">🎰 Гемблинг</option>
            <option value="arbitrage">📊 Арбитраж</option>
            <option value="finance">💰 Финансы</option>
            <option value="other">🌐 Другое</option>
          </select>
        </FormField>
        <div className="flex gap-4 mb-4">
          <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
            <input type="checkbox" checked={form.isMonitored} onChange={e=>setForm({...form, isMonitored:e.target.checked})}
              className="accent-accent"/>
            Включить мониторинг
          </label>
          <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
            <input type="checkbox" checked={form.isParsing} onChange={e=>setForm({...form, isParsing:e.target.checked})}
              className="accent-accent"/>
            Включить автопарсинг
          </label>
        </div>
        <button className="btn-primary w-full justify-center" onClick={handleAdd}>
          <Plus size={14}/> Добавить канал
        </button>
      </Modal>
    {/* Parser Filter Modal */}
      {filterOpen && (() => {
        const ch = channels.find(c=>c.id===filterOpen)
        return (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="card w-full max-w-md p-6">
              <div className="text-base font-black mb-2">Фильтры базы @{ch?.username}</div>
              <div className="text-xs text-muted mb-5">Всего: {ch?.parsedCount||0} пользователей</div>
              <div className="space-y-4 mb-6">
                <FormField label="Аватарка">
                  <select className="input" value={filterOpts.hasAvatar} onChange={e=>setFilterOpts({...filterOpts,hasAvatar:e.target.value})}>
                    <option value="any">Любые</option>
                    <option value="yes">Только с аватаркой</option>
                    <option value="no">Только без аватарки</option>
                  </select>
                </FormField>
                <FormField label="Последний онлайн (дней назад, не позже)">
                  <input className="input" type="number" placeholder="7 = был онлайн за 7 дней"
                    value={filterOpts.minDaysOnline} onChange={e=>setFilterOpts({...filterOpts,minDaysOnline:e.target.value})}/>
                </FormField>
              </div>
              <div className="flex gap-3">
                <button className="btn-primary flex-1" onClick={async()=>{
                  const params = new URLSearchParams({ channelId: filterOpen })
                  if (filterOpts.hasAvatar !== 'any') params.set('hasAvatar', filterOpts.hasAvatar === 'yes' ? '1' : '0')
                  if (filterOpts.minDaysOnline) params.set('maxDaysOffline', filterOpts.minDaysOnline)
                  const res = await fetch(`/api/channels/filtered-users?${params}`)
                  const data = await res.json()
                  setFilterCount(data.count)
                }}>
                  Применить фильтр
                </button>
                <button className="btn-ghost" onClick={()=>{setFilterOpen(null);setFilterCount(null)}}>Закрыть</button>
              </div>
              {filterCount !== null && (
                <div className="mt-4 text-sm text-center font-bold text-success">
                  Подходит: {filterCount} пользователей из {ch?.parsedCount||0}
                </div>
              )}
            </div>
          </div>
        )
      })()}
    </Layout>
  )
}
