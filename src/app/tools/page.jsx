'use client'
import { useState, useEffect } from 'react'
import { Hash, UserCheck, Zap, Copy, Plus, Play, Trash2, Info, Shield, GitBranch, MessageSquare, Heart } from 'lucide-react'
import toast from 'react-hot-toast'
import { Layout, Topbar } from '@/components/layout/Layout'
import { Modal, FormField, Badge, Spinner } from '@/components/ui'
import { checkAccount } from '@/lib/accountCheck'

export default function Tools() {
  const [accounts, setAccounts]   = useState([])
  const [boosts,   setBoosts]     = useState([])
  const [tab,      setTab]        = useState('numcheck')
  const [loading,  setLoading]    = useState(false)

  // Number checker state
  const [phones,   setPhones]     = useState('')
  const [numResults, setNumResults] = useState(null)

  // Profile filler state
  const [fillAccIds,  setFillAccIds]  = useState([])
  const [fillGender,  setFillGender]  = useState('any')
  const [fillUsername,setFillUsername]= useState(false)
  const [fillResults, setFillResults] = useState(null)

  // Reauth state
  const [reauthIds,   setReauthIds]   = useState([])
  const [reauthResult,setReauthResult]= useState(null)

  // Reporter state
  const [reportTarget, setReportTarget] = useState('')
  const [reportReason, setReportReason] = useState('spam')
  const [reportAccIds, setReportAccIds] = useState([])
  const [reportMsg,    setReportMsg]    = useState('')
  const [reportResult, setReportResult] = useState(null)

  // Cloner state
  const [clonerSrc,   setClonerSrc]   = useState('')
  const [clonerDst,   setClonerDst]   = useState('')
  const [clonerAccId, setClonerAccId] = useState('')
  const [clonerLimit, setClonerLimit] = useState(100)

  // Creator state
  const [chatTitle,   setChatTitle]   = useState('')
  const [chatAbout,   setChatAbout]   = useState('')
  const [chatUsername,setChatUsername]= useState('')
  const [chatIsChannel,setChatIsChannel]= useState(false)
  const [chatAccId,   setChatAccId]   = useState('')

  // Post likes state
  const [plChannel, setPlChannel] = useState('')
  const [plPostIds, setPlPostIds] = useState('')
  const [plEmoji,   setPlEmoji]   = useState('❤️')
  const [plAccIds,  setPlAccIds]  = useState([])
  const [plResult,  setPlResult]  = useState(null)

  // Boost state
  const [boostOpen,   setBoostOpen]   = useState(false)
  const [boostForm,   setBoostForm]   = useState({ name:'', type:'reactions', target:'', postId:'', emoji:'❤️', count:100, accountIds:[] })

  useEffect(() => {
    fetch('/api/accounts').then(r=>r.json()).then(d=>setAccounts(Array.isArray(d)?d:[])).catch(()=>{})
    fetch('/api/boost').then(r=>r.json()).then(d=>setBoosts(Array.isArray(d)?d:[])).catch(()=>{})
  }, [])

  const activeAccounts = accounts.filter(a => a.status === 'ACTIVE')
  const accCheck = checkAccount(accounts)

  const runNumCheck = async () => {
    if (!accCheck.ok) { toast.error(accCheck.error); return }
    const list = phones.split(/[\n,]/).map(p=>p.trim()).filter(Boolean)
    if (!list.length) { toast.error('Введи номера телефонов'); return }
    setLoading(true)
    const res = await fetch('/api/numcheck', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ phones: list, accountId: accCheck.account.id })
    })
    const data = await res.json()
    setNumResults(data)
    setLoading(false)
    toast.success(`Проверено: ${data.found} из ${data.total} зарегистрированы`)
  }

  const runFillProfile = async () => {
    if (fillAccIds.length === 0) { toast.error('Выбери аккаунты'); return }
    setLoading(true)
    const res = await fetch('/api/accounts/fill-profile', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ accountIds: fillAccIds, gender: fillGender, setUsername: fillUsername })
    })
    const data = await res.json()
    setFillResults(data.results)
    setLoading(false)
    toast.success(`Профили заполнены: ${data.results.filter(r=>r.ok).length} успешно`)
  }

  const runReauth = async () => {
    if (reauthIds.length === 0) { toast.error('Выбери аккаунты'); return }
    setLoading(true)
    const res = await fetch('/api/accounts/reauth', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ accountIds: reauthIds })
    })
    const data = await res.json()
    setReauthResult(data.results)
    setLoading(false)
    toast.success('Сторонние сессии закрыты')
  }

  const runReporter = async () => {
    if (!reportTarget) { toast.error('Укажи цель'); return }
    if (reportAccIds.length === 0) { toast.error('Выбери аккаунты'); return }
    setLoading(true)
    const res = await fetch('/api/reporter', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ target: reportTarget, reason: reportReason, accountIds: reportAccIds, message: reportMsg })
    })
    const data = await res.json()
    setReportResult(data)
    setLoading(false)
    toast.success(`Жалоб отправлено: ${data.sent}`)
  }

  const runCloner = async () => {
    if (!clonerSrc || !clonerDst || !clonerAccId) { toast.error('Заполни все поля'); return }
    const res = await fetch('/api/cloner', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ sourceChat: clonerSrc, targetChat: clonerDst, accountId: +clonerAccId, limit: clonerLimit })
    })
    const data = await res.json()
    toast.success(data.message || 'Клонирование запущено')
  }

  const runCreateChat = async () => {
    if (!chatTitle || !chatAccId) { toast.error('Укажи название и аккаунт'); return }
    setLoading(true)
    const res = await fetch('/api/create-chat', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ title: chatTitle, about: chatAbout, username: chatUsername, isChannel: chatIsChannel, accountId: +chatAccId })
    })
    const data = await res.json()
    setLoading(false)
    if (res.ok) toast.success(`✅ Создан: ${data.title}`)
    else toast.error(data.error)
  }

  const runPostLikes = async () => {
    const check = accCheck
    if (!check.ok) { toast.error(check.error); return }
    if (!plChannel) { toast.error('Укажи канал'); return }
    const ids = plPostIds.split(/[\n,]/).map(s=>s.trim()).filter(Boolean).map(Number)
    if (!ids.length) { toast.error('Укажи ID постов'); return }
    if (!plAccIds.length) { toast.error('Выбери аккаунты'); return }
    setLoading(true)
    const res = await fetch('/api/postlikes', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ channel:plChannel, postIds:ids, emoji:plEmoji, accountIds:plAccIds })
    })
    const data = await res.json()
    setPlResult(data); setLoading(false)
    toast.success(`✅ Лайков поставлено: ${data.done}, ошибок: ${data.failed}`)
  }

  const createBoost = async () => {
    const res = await fetch('/api/boost', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(boostForm)})
    if (res.ok) { toast.success('Задача создана'); setBoostOpen(false); fetch('/api/boost').then(r=>r.json()).then(d=>setBoosts(d)) }
  }

  const startBoost = async (id) => {
    await fetch(`/api/boost/${id}/start`, {method:'POST'})
    toast.success('Накрутка запущена')
    fetch('/api/boost').then(r=>r.json()).then(d=>setBoosts(d))
  }

  const toggleAcc = (setter, id) => setter(p => p.includes(id) ? p.filter(a=>a!==id) : [...p, id])

  const TABS = [
    { id:'numcheck',  label:'Чекер номеров',    icon:Hash },
    { id:'fill',      label:'Заполнение профилей', icon:UserCheck },
    { id:'reauth',    label:'Переавторизация',   icon:Shield },
    { id:'reporter',  label:'Репортер',          icon:MessageSquare },
    { id:'cloner',    label:'Клонер',            icon:Copy },
    { id:'creator',   label:'Создать чат/канал', icon:Plus },
    { id:'boost',     label:'Накрутка',          icon:Zap },
    { id:'postlikes',  label:'Лайки постов',      icon:Heart },
  ]

  return (
    <Layout>
      <Topbar title="Инструменты" subtitle="Дополнительные функции для работы с аккаунтами"/>
      <div className="p-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 flex-wrap">
          {TABS.map(t => (
            <button key={t.id} onClick={()=>setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border
                ${tab===t.id ? 'bg-accent/10 border-accent/30 text-accent' : 'border-border text-muted hover:text-[#e8eaf0] hover:bg-surface2'}`}>
              <t.icon size={13}/> {t.label}
            </button>
          ))}
        </div>

        {/* Number Checker */}
        {tab === 'numcheck' && (
          <div className="space-y-4 max-w-2xl">
            <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 text-xs text-muted">
              <span className="text-[#e8eaf0] font-bold">Чекер номеров</span> — проверяет зарегистрированы ли номера в Telegram. Возвращает username, имя и TG ID если аккаунт существует.
            </div>
            <FormField label="Номера телефонов (по одному на строке или через запятую)">
              <textarea className="input resize-none h-40 font-mono text-sm" placeholder="+79991234567&#10;+79997654321&#10;+12345678901"
                value={phones} onChange={e=>setPhones(e.target.value)}/>
              <div className="text-[10px] font-mono text-muted mt-1">{phones.split(/[\n,]/).filter(p=>p.trim()).length} номеров</div>
            </FormField>
            <button className="btn-primary" onClick={runNumCheck} disabled={loading}>
              {loading ? '⏳ Проверяем...' : <><Hash size={14}/> Проверить</>}
            </button>
            {numResults && (
              <div className="card overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex gap-4 text-xs font-mono">
                  <span>Всего: <b>{numResults.total}</b></span>
                  <span className="text-success">Найдено: <b>{numResults.found}</b></span>
                  <span className="text-muted">Не найдено: <b>{numResults.total - numResults.found}</b></span>
                </div>
                <div className="divide-y divide-border max-h-64 overflow-y-auto">
                  {numResults.results.map((r,i) => (
                    <div key={i} className={`px-4 py-2.5 flex items-center gap-3 text-xs ${!r.exists?'opacity-40':''}`}>
                      <span className={r.exists?'text-success':'text-danger'}>{r.exists?'✅':'❌'}</span>
                      <span className="font-mono text-muted">{r.phone}</span>
                      {r.exists && <>
                        <span className="font-bold">{r.firstName} {r.lastName}</span>
                        {r.username && <span className="text-accent">@{r.username}</span>}
                        <span className="text-[10px] text-muted ml-auto">ID: {r.tgId}</span>
                      </>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Profile Filler */}
        {tab === 'fill' && (
          <div className="space-y-4 max-w-2xl">
            <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 text-xs text-muted">
              <span className="text-[#e8eaf0] font-bold">Заполнение профилей</span> — устанавливает случайное русское имя и фамилию на выбранных аккаунтах. Опционально ставит username.
            </div>
            <FormField label="Пол имён">
              <select className="input" value={fillGender} onChange={e=>setFillGender(e.target.value)}>
                <option value="any">Любой</option>
                <option value="male">Мужские</option>
                <option value="female">Женские</option>
              </select>
            </FormField>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="accent-accent" checked={fillUsername} onChange={e=>setFillUsername(e.target.checked)}/>
              Также поставить username (имя + случайные цифры)
            </label>
            <FormField label={`Аккаунты (${fillAccIds.length} выбрано)`}>
              <div className="border border-border rounded-lg max-h-40 overflow-y-auto divide-y divide-border">
                {activeAccounts.map(a => (
                  <label key={a.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-surface2">
                    <input type="checkbox" className="accent-accent" checked={fillAccIds.includes(a.id)} onChange={()=>toggleAcc(setFillAccIds, a.id)}/>
                    <span className="text-xs font-mono">{a.phone}</span>
                    <span className="text-[10px] text-muted ml-auto">{a.firstName || '—'}</span>
                  </label>
                ))}
              </div>
            </FormField>
            <button className="btn-primary" onClick={runFillProfile} disabled={loading}>
              {loading ? '⏳ Заполняем...' : <><UserCheck size={14}/> Заполнить профили</>}
            </button>
            {fillResults && (
              <div className="space-y-1">
                {fillResults.map((r,i) => (
                  <div key={i} className={`text-xs font-mono rounded px-3 py-1.5 ${r.ok?'bg-success/10 text-success':'bg-danger/10 text-danger'}`}>
                    {r.ok ? `✅ Аккаунт #${r.id}: ${r.name}` : `❌ Аккаунт #${r.id}: ${r.error}`}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Reauth */}
        {tab === 'reauth' && (
          <div className="space-y-4 max-w-2xl">
            <div className="bg-yellow-400/5 border border-yellow-400/20 rounded-xl p-4 text-xs text-yellow-400">
              ⚠️ <span className="font-bold">Переавторизация</span> закрывает ВСЕ активные сессии кроме текущей. Используй если подозреваешь что кто-то ещё имеет доступ к аккаунту.
            </div>
            <FormField label={`Аккаунты (${reauthIds.length} выбрано)`}>
              <div className="border border-border rounded-lg max-h-40 overflow-y-auto divide-y divide-border">
                {activeAccounts.map(a => (
                  <label key={a.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-surface2">
                    <input type="checkbox" className="accent-accent" checked={reauthIds.includes(a.id)} onChange={()=>toggleAcc(setReauthIds, a.id)}/>
                    <span className="text-xs font-mono">{a.phone}</span>
                  </label>
                ))}
              </div>
            </FormField>
            <button className="btn-primary" onClick={runReauth} disabled={loading}>
              {loading ? '⏳ Закрываем сессии...' : <><Shield size={14}/> Закрыть сторонние сессии</>}
            </button>
            {reauthResult && (
              <div className="space-y-1">
                {reauthResult.map((r,i) => (
                  <div key={i} className={`text-xs font-mono rounded px-3 py-1.5 ${r.ok?'bg-success/10 text-success':'bg-danger/10 text-danger'}`}>
                    {r.ok ? `✅ Аккаунт #${r.id}: ${r.message}` : `❌ Аккаунт #${r.id}: ${r.error}`}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Reporter */}
        {tab === 'reporter' && (
          <div className="space-y-4 max-w-2xl">
            <div className="bg-danger/5 border border-danger/20 rounded-xl p-4 text-xs text-muted">
              <span className="text-danger font-bold">Репортер</span> отправляет жалобы на пользователей, чаты или каналы. Используй осознанно — злоупотребление может привести к ограничениям.
            </div>
            <FormField label="Цель (username, ссылка или ID)">
              <input className="input" placeholder="@username или t.me/link" value={reportTarget} onChange={e=>setReportTarget(e.target.value)}/>
            </FormField>
            <FormField label="Причина жалобы">
              <select className="input" value={reportReason} onChange={e=>setReportReason(e.target.value)}>
                <option value="spam">Спам</option>
                <option value="violence">Насилие</option>
                <option value="porn">Порнография</option>
                <option value="illegal">Незаконные наркотики</option>
                <option value="other">Другое</option>
              </select>
            </FormField>
            <FormField label="Комментарий (необязательно)">
              <input className="input" placeholder="Описание нарушения" value={reportMsg} onChange={e=>setReportMsg(e.target.value)}/>
            </FormField>
            <FormField label={`Аккаунты для жалоб (${reportAccIds.length})`}>
              <div className="border border-border rounded-lg max-h-32 overflow-y-auto divide-y divide-border">
                {activeAccounts.map(a => (
                  <label key={a.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-surface2">
                    <input type="checkbox" className="accent-accent" checked={reportAccIds.includes(a.id)} onChange={()=>toggleAcc(setReportAccIds, a.id)}/>
                    <span className="text-xs font-mono">{a.phone}</span>
                  </label>
                ))}
              </div>
            </FormField>
            <button className="btn-primary" onClick={runReporter} disabled={loading}>
              {loading ? '⏳ Отправляем...' : <><MessageSquare size={14}/> Отправить жалобы</>}
            </button>
            {reportResult && <div className="text-sm text-success">✅ Жалоб отправлено: {reportResult.sent}</div>}
          </div>
        )}

        {/* Cloner */}
        {tab === 'cloner' && (
          <div className="space-y-4 max-w-2xl">
            <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 text-xs text-muted">
              <span className="text-[#e8eaf0] font-bold">Клонер</span> копирует сообщения из одного чата/канала в другой. Аккаунт должен быть участником источника и иметь права писать в цель.
            </div>
            <FormField label="Источник (откуда клонировать)">
              <input className="input" placeholder="@source_chat" value={clonerSrc} onChange={e=>setClonerSrc(e.target.value)}/>
            </FormField>
            <FormField label="Цель (куда клонировать)">
              <input className="input" placeholder="@my_chat" value={clonerDst} onChange={e=>setClonerDst(e.target.value)}/>
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Аккаунт">
                <select className="input" value={clonerAccId} onChange={e=>setClonerAccId(e.target.value)}>
                  <option value="">— выбрать —</option>
                  {activeAccounts.map(a => <option key={a.id} value={a.id}>{a.phone}</option>)}
                </select>
              </FormField>
              <FormField label="Лимит сообщений">
                <input className="input" type="number" value={clonerLimit} onChange={e=>setClonerLimit(+e.target.value)}/>
              </FormField>
            </div>
            <button className="btn-primary" onClick={runCloner}><Copy size={14}/> Запустить клонирование</button>
          </div>
        )}

        {/* Chat Creator */}
        {tab === 'creator' && (
          <div className="space-y-4 max-w-2xl">
            <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 text-xs text-muted">
              <span className="text-[#e8eaf0] font-bold">Создатель чатов и каналов</span> — создаёт новый чат или broadcast-канал через указанный аккаунт.
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="accent-accent" checked={chatIsChannel} onChange={e=>setChatIsChannel(e.target.checked)}/>
              Создать канал (broadcast), а не группу
            </label>
            <FormField label="Название">
              <input className="input" placeholder="Мой крипто канал" value={chatTitle} onChange={e=>setChatTitle(e.target.value)}/>
            </FormField>
            <FormField label="Описание">
              <input className="input" placeholder="Описание канала..." value={chatAbout} onChange={e=>setChatAbout(e.target.value)}/>
            </FormField>
            {chatIsChannel && (
              <FormField label="Username (необязательно)">
                <input className="input" placeholder="mycryptoChannel" value={chatUsername} onChange={e=>setChatUsername(e.target.value)}/>
              </FormField>
            )}
            <FormField label="Аккаунт">
              <select className="input" value={chatAccId} onChange={e=>setChatAccId(e.target.value)}>
                <option value="">— выбрать —</option>
                {activeAccounts.map(a => <option key={a.id} value={a.id}>{a.phone}</option>)}
              </select>
            </FormField>
            <button className="btn-primary" onClick={runCreateChat} disabled={loading}>
              {loading ? '⏳ Создаём...' : <><Plus size={14}/> Создать {chatIsChannel?'канал':'группу'}</>}
            </button>
          </div>
        )}

        {/* Boost */}
        {tab === 'boost' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 text-xs text-muted flex-1 mr-4">
                <span className="text-[#e8eaf0] font-bold">Накрутка</span> — массово ставит реакции на посты или накручивает просмотры через аккаунты.
              </div>
              <button className="btn-primary" onClick={()=>setBoostOpen(true)}><Plus size={14}/> Новая задача</button>
            </div>
            {boosts.length === 0 ? (
              <div className="card p-8 text-center text-muted text-sm">Нет задач накрутки</div>
            ) : (
              <div className="space-y-3">
                {boosts.map(b => (
                  <div key={b.id} className="card p-4 flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold">{b.name}</span>
                        <Badge color={b.status==='DONE'?'green':b.status==='RUNNING'?'blue':'purple'}>
                          {b.status==='DONE'?'Готово':b.status==='RUNNING'?'Идёт':'Черновик'}
                        </Badge>
                        <span className="text-xs font-mono text-muted">{b.type} · {b.emoji} · {b.count}шт</span>
                      </div>
                      <div className="text-xs font-mono text-muted">@{b.target} · выполнено: {b.done}</div>
                    </div>
                    {b.status === 'DRAFT' && (
                      <button className="btn-primary text-xs px-4 py-2" onClick={()=>startBoost(b.id)}>
                        <Play size={12}/> Запустить
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Post Likes */}
      {tab === 'postlikes' && (
        <div className="space-y-4 max-w-2xl">
          <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 text-xs text-muted">
            <span className="text-[#e8eaf0] font-bold">Лайки постов</span> — массово ставит реакции на конкретные посты канала с нескольких аккаунтов. Укажи username канала и ID постов (можно несколько).
          </div>
          <FormField label="Канал (@username)">
            <input className="input" placeholder="@mychannel" value={plChannel} onChange={e=>setPlChannel(e.target.value)}/>
          </FormField>
          <FormField label="ID постов (по одному на строке)">
            <textarea className="input resize-none h-24 font-mono text-sm" placeholder="123&#10;124&#10;125" value={plPostIds} onChange={e=>setPlPostIds(e.target.value)}/>
          </FormField>
          <FormField label="Эмодзи реакции">
            <div className="flex gap-2 flex-wrap">
              {['❤️','👍','🔥','🎉','😎','💯','🤩','👏'].map(e=>(
                <button key={e} onClick={()=>setPlEmoji(e)}
                  className={`text-xl px-3 py-2 rounded-xl border transition-all ${plEmoji===e?'border-accent bg-accent/10':'border-border hover:bg-surface2'}`}>
                  {e}
                </button>
              ))}
            </div>
          </FormField>
          <FormField label={`Аккаунты (${plAccIds.length} выбрано)`}>
            <div className="border border-border rounded-lg max-h-36 overflow-y-auto divide-y divide-border">
              {activeAccounts.map(a=>(
                <label key={a.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-surface2">
                  <input type="checkbox" className="accent-accent" checked={plAccIds.includes(a.id)}
                    onChange={()=>setPlAccIds(p=>p.includes(a.id)?p.filter(x=>x!==a.id):[...p,a.id])}/>
                  <span className="text-xs font-mono">{a.phone}</span>
                </label>
              ))}
            </div>
          </FormField>
          <button className="btn-primary" onClick={runPostLikes} disabled={loading}>
            {loading?'⏳ Ставим лайки...':<><Heart size={14}/> Поставить лайки</>}
          </button>
          {plResult && (
            <div className="card p-4 font-mono text-sm space-y-1">
              <div>✅ Успешно: <b className="text-success">{plResult.done}</b></div>
              <div>❌ Ошибок: <b className="text-danger">{plResult.failed}</b></div>
              <div className="text-[11px] text-muted mt-2">По постам: {Object.entries(plResult.byPost||{}).map(([id,c])=>`#${id}: ${c}`).join(', ')}</div>
            </div>
          )}
        </div>
      )}

      {/* Boost Modal */}
      <Modal open={boostOpen} onClose={()=>setBoostOpen(false)} title="Новая задача накрутки">
        <FormField label="Название"><input className="input" value={boostForm.name} onChange={e=>setBoostForm({...boostForm,name:e.target.value})} placeholder="Реакции на пост"/></FormField>
        <FormField label="Тип">
          <select className="input" value={boostForm.type} onChange={e=>setBoostForm({...boostForm,type:e.target.value})}>
            <option value="reactions">❤️ Реакции на пост</option>
            <option value="views">👁 Просмотры поста</option>
          </select>
        </FormField>
        <FormField label="Канал/чат (@username)"><input className="input" value={boostForm.target} onChange={e=>setBoostForm({...boostForm,target:e.target.value.replace('@','')})} placeholder="@channel"/></FormField>
        {boostForm.type === 'reactions' && (
          <div className="grid grid-cols-2 gap-3">
            <FormField label="ID поста"><input className="input" type="number" value={boostForm.postId} onChange={e=>setBoostForm({...boostForm,postId:+e.target.value})}/></FormField>
            <FormField label="Эмодзи реакции"><input className="input" value={boostForm.emoji} onChange={e=>setBoostForm({...boostForm,emoji:e.target.value})}/></FormField>
          </div>
        )}
        <FormField label="Количество"><input className="input" type="number" value={boostForm.count} onChange={e=>setBoostForm({...boostForm,count:+e.target.value})}/></FormField>
        <FormField label={`Аккаунты (${boostForm.accountIds.length})`}>
          <div className="border border-border rounded-lg max-h-32 overflow-y-auto divide-y divide-border">
            {activeAccounts.map(a => (
              <label key={a.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-surface2">
                <input type="checkbox" className="accent-accent" checked={boostForm.accountIds.includes(a.id)}
                  onChange={()=>setBoostForm(f=>({...f,accountIds:f.accountIds.includes(a.id)?f.accountIds.filter(x=>x!==a.id):[...f.accountIds,a.id]}))}/>
                <span className="text-xs font-mono">{a.phone}</span>
              </label>
            ))}
          </div>
        </FormField>
        <button className="btn-primary w-full justify-center" onClick={createBoost}><Zap size={14}/> Создать</button>
      </Modal>
    </Layout>
  )
}
