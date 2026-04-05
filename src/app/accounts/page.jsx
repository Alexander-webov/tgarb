'use client'
import { useEffect, useState } from 'react'
import { Plus, Upload, Wifi, Trash2, RefreshCw, CheckCircle2, AlertTriangle, WifiOff, Key, Filter, Tag, Globe, FolderOpen } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Layout, Topbar } from '@/components/layout/Layout'
import { Modal, FormField, Badge, ProgressBar, Toggle, Spinner, Empty } from '@/components/ui'

const STATUS_META = {
  ACTIVE:  { label: 'Активен',  color: 'green',  icon: CheckCircle2 },
  WARMING: { label: 'Прогрев',  color: 'yellow', icon: RefreshCw },
  LIMITED: { label: 'Лимит',    color: 'yellow', icon: AlertTriangle },
  BANNED:  { label: 'Бан',      color: 'red',    icon: WifiOff },
  OFFLINE: { label: 'Офлайн',   color: 'purple', icon: WifiOff },
}

const GEO_FLAGS = { RU:'🇷🇺', US:'🇺🇸', VN:'🇻🇳', UA:'🇺🇦', KZ:'🇰🇿', BY:'🇧🇾', DE:'🇩🇪', UK:'🇬🇧', PL:'🇵🇱' }

export default function Accounts() {
  const [accounts,  setAccounts]  = useState([])
  const [proxies,   setProxies]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [addOpen,   setAddOpen]   = useState(false)
  const [jsonOpen,  setJsonOpen]  = useState(false)
  const [proxyOpen, setProxyOpen] = useState(false)
  const [jsonFile,  setJsonFile]  = useState(null)
  const [sesFile,   setSesFile]   = useState(null)
  const [importing, setImporting] = useState(false)
  const [selected,  setSelected]  = useState([])
  const [bulkOpen,  setBulkOpen]  = useState(false)
  const [bulkRole,  setBulkRole]  = useState('')
  const [bulkFolder,setBulkFolder]= useState('')
  const [bulkGeo,   setBulkGeo]   = useState('')
  const [accErrors, setAccErrors] = useState({})
  const [checking,  setChecking]  = useState({})
  const [checkResult,setCheckResult]=useState({})

  // Filters
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterGeo,    setFilterGeo]    = useState('')
  const [filterFolder, setFilterFolder] = useState('')
  const [filterRole,   setFilterRole]   = useState('')
  const [search,       setSearch]       = useState('')

  const [form,      setForm]      = useState({ phone:'', dailyLimit:50, delayMin:20, delayMax:60 })
  const [proxyForm, setProxyForm] = useState({ host:'', port:1080, proxyType:'socks5', username:'', password:'', country:'' })

  const load = async () => {
    setLoading(true)
    const [a, p] = await Promise.all([
      fetch('/api/accounts').then(r=>r.json()).catch(()=>[]),
      fetch('/api/proxies').then(r=>r.json()).catch(()=>[]),
    ])
    setAccounts(Array.isArray(a)?a:[]); setProxies(Array.isArray(p)?p:[]); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const handleAdd = async () => {
    const res = await fetch('/api/accounts', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) })
    if (res.ok) { toast.success('Аккаунт добавлен'); setAddOpen(false); load() } else toast.error('Ошибка')
  }

  const handleConnect = async (id) => {
    setAccErrors(p=>({...p,[id]:null}))
    toast.loading('Подключаем...', { id:`connect-${id}` })
    const res = await fetch(`/api/accounts/${id}/connect`, { method:'POST' })
    const data = await res.json()
    toast.dismiss(`connect-${id}`)
    if (res.ok) { toast.success(`✅ Подключён!`); setAccErrors(p=>({...p,[id]:null})) }
    else { toast.error(data.message, { duration:8000 }); setAccErrors(p=>({...p,[id]:data.message})) }
    setTimeout(load, 1500)
  }

  const handleUpload = async (id, file) => {
    const fd = new FormData(); fd.append('file', file)
    await fetch(`/api/accounts/${id}/session`, { method:'POST', body:fd })
    toast.success('Session загружен!'); load()
  }

  const handleDelete = async (id) => {
    if (!confirm('Удалить аккаунт?')) return
    await fetch(`/api/accounts/${id}`, { method:'DELETE' })
    toast.success('Удалён'); load()
  }

  const handleAddProxy = async () => {
    const res = await fetch('/api/proxies', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({...proxyForm, port:+proxyForm.port}) })
    if (res.ok) { toast.success('Прокси добавлен'); setProxyOpen(false); load() } else toast.error('Ошибка')
  }

  const importJson = async () => {
    if (!jsonFile || !sesFile) { toast.error('Загрузи оба файла'); return }
    setImporting(true)
    const fd = new FormData(); fd.append('json', jsonFile); fd.append('session', sesFile)
    const res = await fetch('/api/accounts/import-json', { method:'POST', body:fd })
    const data = await res.json()
    setImporting(false)
    if (res.ok) { toast.success(data.message); setJsonOpen(false); setJsonFile(null); setSesFile(null); load() }
    else toast.error(data.error || 'Ошибка')
  }

  const handleSpamCheck = async (id) => {
    setChecking(p=>({...p,[id]:true})); setCheckResult(p=>({...p,[id]:null}))
    toast.loading('Проверяем спамблок...', { id:`check-${id}` })
    const res = await fetch('/api/accounts/spamcheck', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ accountIds:[id] }) })
    const data = await res.json()
    toast.dismiss(`check-${id}`); setChecking(p=>({...p,[id]:false}))
    const r = data.results?.[0]
    if (r) {
      setCheckResult(p=>({...p,[id]:r}))
      if (r.status==='clean') toast.success(`✅ Без спамблока`)
      else if (r.status==='limited') toast.error(`⚠️ Ограничен SpamBot`, { duration:8000 })
      else if (r.status==='banned') toast.error(`🚫 Забанен!`, { duration:8000 })
    }
    load()
  }

  const handleBulkUpdate = async () => {
    const data = {}
    if (bulkRole) data.role = bulkRole
    if (bulkFolder) data.folder = bulkFolder
    if (bulkGeo) data.geo = bulkGeo
    if (!Object.keys(data).length) { toast.error('Выбери хотя бы одно поле'); return }
    await fetch('/api/accounts', { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ ids:selected, ...data }) })
    toast.success(`Обновлено ${selected.length} аккаунтов`)
    setSelected([]); setBulkOpen(false); load()
  }

  const toggleSelect = (id) => setSelected(p => p.includes(id) ? p.filter(a=>a!==id) : [...p, id])
  const selectAll = () => setSelected(filtered.map(a=>a.id))
  const clearSelect = () => setSelected([])

  // Get unique values for filters
  const folders = [...new Set(accounts.map(a=>a.folder).filter(Boolean))]
  const roles = [...new Set(accounts.map(a=>a.role).filter(Boolean))]
  const geos = [...new Set(accounts.map(a=>a.geo).filter(Boolean))]

  const filtered = accounts.filter(a => {
    if (filterStatus !== 'all' && a.status !== filterStatus) return false
    if (filterGeo && a.geo !== filterGeo) return false
    if (filterFolder && a.folder !== filterFolder) return false
    if (filterRole && a.role !== filterRole) return false
    if (search && !a.phone.includes(search) && !(a.firstName||'').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <Layout>
      <Topbar title="Аккаунты"
        subtitle={`${accounts.filter(a=>a.status==='ACTIVE').length} активных · ${accounts.length} всего`}
        actions={
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={()=>setProxyOpen(true)}><Plus size={14}/> Прокси</button>
            <Link href="/accounts/session-gen" className="btn-ghost"><Key size={14}/> Session</Link>
            <button className="btn-ghost" onClick={()=>setJsonOpen(true)}><Upload size={14}/> JSON</button>
            <button className="btn-primary" onClick={()=>setAddOpen(true)}><Plus size={14}/> Аккаунт</button>
          </div>
        }/>

      <div className="p-8 space-y-4">
        {/* Filters */}
        <div className="card p-4">
          <div className="flex gap-3 flex-wrap items-center">
            <Filter size={14} className="text-muted"/>
            <input className="input max-w-xs text-sm py-1.5" placeholder="Поиск по номеру/имени..." value={search} onChange={e=>setSearch(e.target.value)}/>
            <select className="input text-sm py-1.5 w-36" value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
              <option value="all">Все статусы</option>
              <option value="ACTIVE">Активные</option>
              <option value="WARMING">Прогрев</option>
              <option value="LIMITED">Лимит</option>
              <option value="BANNED">Забанены</option>
              <option value="OFFLINE">Офлайн</option>
            </select>
            {geos.length > 0 && (
              <select className="input text-sm py-1.5 w-28" value={filterGeo} onChange={e=>setFilterGeo(e.target.value)}>
                <option value="">Все ГЕО</option>
                {geos.map(g=><option key={g} value={g}>{GEO_FLAGS[g]||''} {g}</option>)}
              </select>
            )}
            {folders.length > 0 && (
              <select className="input text-sm py-1.5 w-32" value={filterFolder} onChange={e=>setFilterFolder(e.target.value)}>
                <option value="">Все папки</option>
                {folders.map(f=><option key={f} value={f}>{f}</option>)}
              </select>
            )}
            {roles.length > 0 && (
              <select className="input text-sm py-1.5 w-36" value={filterRole} onChange={e=>setFilterRole(e.target.value)}>
                <option value="">Все роли</option>
                {roles.map(r=><option key={r} value={r}>{r}</option>)}
              </select>
            )}
            <span className="text-xs font-mono text-muted ml-auto">{filtered.length} / {accounts.length}</span>
          </div>
        </div>

        {/* Bulk actions bar */}
        {selected.length > 0 && (
          <div className="bg-accent/10 border border-accent/30 rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="text-sm font-bold text-accent">Выбрано: {selected.length}</span>
            <button className="btn-ghost text-xs" onClick={()=>setBulkOpen(true)}><Tag size={12}/> Назначить роль/папку/ГЕО</button>
            <button className="btn-ghost text-xs" onClick={async()=>{
              if(!confirm(`Удалить ${selected.length} аккаунтов?`)) return
              await Promise.all(selected.map(id=>fetch(`/api/accounts/${id}`,{method:'DELETE'})))
              toast.success('Удалены'); setSelected([]); load()
            }} title="Удалить выбранные"><Trash2 size={12}/></button>
            <button className="btn-ghost text-xs ml-auto" onClick={clearSelect}>Снять выделение</button>
          </div>
        )}

        {/* Accounts list */}
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-2 space-y-2">
            {loading ? <div className="flex justify-center py-12"><Spinner/></div>
            : filtered.length === 0 ? (
              <div className="card"><Empty icon={WifiOff} text="Нет аккаунтов"
                action={<button className="btn-primary" onClick={()=>setAddOpen(true)}><Plus size={14}/> Добавить</button>}/></div>
            ) : (
              <div className="flex items-center gap-2 mb-2 px-1">
                <input type="checkbox" className="accent-accent" onChange={e=>e.target.checked?selectAll():clearSelect()} checked={selected.length===filtered.length && filtered.length>0}/>
                <span className="text-[10px] font-mono text-muted">Выбрать все</span>
              </div>
            )}
            {filtered.map(acc => {
              const st = STATUS_META[acc.status] || STATUS_META.OFFLINE
              const pct = acc.dailyLimit > 0 ? (acc.sentToday/acc.dailyLimit)*100 : 0
              const barColor = pct>80?'#ff4757':pct>50?'#ffd32a':'#00ff9d'
              return (
                <div key={acc.id} className={`card p-4 flex items-center gap-3 transition-colors ${selected.includes(acc.id)?'border-accent/40':''}`}>
                  <input type="checkbox" className="accent-accent flex-shrink-0" checked={selected.includes(acc.id)} onChange={()=>toggleSelect(acc.id)}/>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent3 to-accent flex items-center justify-center text-sm font-black text-black flex-shrink-0">
                    {(acc.username||acc.phone||'?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="font-bold text-sm">{acc.username?`@${acc.username}`:acc.phone}</span>
                      <Badge color={st.color}>{st.label}</Badge>
                      {acc.geo && <span className="text-[10px] font-mono bg-surface2 px-1.5 py-0.5 rounded">{GEO_FLAGS[acc.geo]||''} {acc.geo}</span>}
                      {acc.role && <span className="text-[10px] font-mono text-accent bg-accent/10 px-1.5 py-0.5 rounded">{acc.role}</span>}
                      {acc.folder && <span className="text-[10px] font-mono text-muted bg-surface2 px-1.5 py-0.5 rounded"><FolderOpen size={9} className="inline mr-0.5"/>{acc.folder}</span>}
                    </div>
                    <div className="text-[11px] font-mono text-muted mb-1">{acc.phone} · {acc.sentToday}/{acc.dailyLimit}/д</div>
                    {acc.status==='BANNED' && <div className="text-xs text-danger bg-danger/10 border border-danger/20 rounded px-2 py-1 mb-1">🚫 Забанен{acc.banReason?`: ${acc.banReason.slice(0,60)}`:''}</div>}
                    {acc.status==='LIMITED' && <div className="text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded px-2 py-1 mb-1">⚠️ Ограничен SpamBot — подожди 24ч</div>}
                    {acc.status==='OFFLINE' && <div className="text-xs text-muted bg-surface2 rounded px-2 py-1 mb-1">💡 Нажми Wi-Fi для подключения</div>}
                    {accErrors[acc.id] && <div className="text-xs text-danger bg-danger/10 border border-danger/20 rounded px-2 py-1 mb-1">⚠️ {accErrors[acc.id]}</div>}
                    {checkResult[acc.id] && (
                      <div className={`text-xs rounded px-2 py-1 mb-1 font-mono
                        ${checkResult[acc.id].status==='clean'?'bg-success/10 text-success':checkResult[acc.id].status==='limited'?'bg-yellow-400/10 text-yellow-400':'bg-danger/10 text-danger'}`}>
                        {checkResult[acc.id].status==='clean'?'✅ Без спамблока':checkResult[acc.id].status==='limited'?'⚠️ Ограничен SpamBot':'🚫 Забанен'}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <ProgressBar value={acc.sentToday} max={acc.dailyLimit} color={barColor} className="flex-1"/>
                      <span className="text-[10px] font-mono text-muted">{acc.sentToday}/{acc.dailyLimit}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <label className="cursor-pointer" title="Загрузить .session файл">
                      <input type="file" className="hidden" accept=".session" onChange={e=>e.target.files[0]&&handleUpload(acc.id,e.target.files[0])}/>
                      <span className="btn-ghost text-xs px-2 py-1.5 cursor-pointer"><Upload size={12}/></span>
                    </label>
                    <button className="btn-ghost text-xs px-2 py-1.5" onClick={()=>handleConnect(acc.id)} title="Подключить"><Wifi size={12}/></button>
                    <button className="btn-ghost text-xs px-2 py-1.5" onClick={()=>handleSpamCheck(acc.id)} disabled={checking[acc.id]} title="Проверить спамблок">
                      {checking[acc.id]?'⏳':'🛡'}
                    </button>
                    <button className="btn-ghost text-xs px-2 py-1.5 hover:border-danger hover:text-danger" onClick={()=>handleDelete(acc.id)} title="Удалить"><Trash2 size={12}/></button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Stats */}
            <div className="card p-4">
              <div className="text-sm font-bold mb-3">Статистика</div>
              {Object.entries(STATUS_META).map(([s, m]) => {
                const count = accounts.filter(a=>a.status===s).length
                if (!count) return null
                return (
                  <div key={s} className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-muted">{m.label}</span>
                    <Badge color={m.color}>{count}</Badge>
                  </div>
                )
              })}
            </div>

            {/* GEO breakdown */}
            {geos.length > 0 && (
              <div className="card p-4">
                <div className="text-sm font-bold mb-3 flex items-center gap-2"><Globe size={13}/> По ГЕО</div>
                {geos.map(g => (
                  <div key={g} className="flex items-center justify-between mb-1.5">
                    <button className="text-xs text-muted hover:text-accent" onClick={()=>setFilterGeo(filterGeo===g?'':g)}>
                      {GEO_FLAGS[g]||''} {g}
                    </button>
                    <span className="text-xs font-mono">{accounts.filter(a=>a.geo===g).length}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Folders */}
            {folders.length > 0 && (
              <div className="card p-4">
                <div className="text-sm font-bold mb-3 flex items-center gap-2"><FolderOpen size={13}/> Папки</div>
                {folders.map(f => (
                  <div key={f} className="flex items-center justify-between mb-1.5">
                    <button className="text-xs text-muted hover:text-accent" onClick={()=>setFilterFolder(filterFolder===f?'':f)}>
                      📁 {f}
                    </button>
                    <span className="text-xs font-mono">{accounts.filter(a=>a.folder===f).length}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Proxies */}
            <div className="card">
              <div className="px-4 py-3 border-b border-border text-sm font-bold">Прокси ({proxies.length})</div>
              <div className="p-3 space-y-2 max-h-48 overflow-y-auto">
                {proxies.length===0 ? <p className="text-xs font-mono text-muted text-center py-3">Нет прокси</p>
                : proxies.map(p=>(
                  <div key={p.id} className="flex items-center justify-between bg-surface2 rounded-lg px-3 py-2">
                    <div>
                      <div className="text-xs font-bold">{p.country||'??'}-{p.proxyType?.toUpperCase()}</div>
                      <div className="text-[10px] font-mono text-muted">{p.host}:{p.port}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge color={p.isActive?'green':'red'}>{p.isActive?'OK':'Down'}</Badge>
                      <button className="text-muted hover:text-danger" onClick={async()=>{await fetch(`/api/proxies/${p.id}`,{method:'DELETE'});load()}}><Trash2 size={12}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* JSON Import Modal */}
      {jsonOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6">
            <div className="text-base font-black mb-5">Импорт JSON + Session</div>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-[11px] font-mono text-muted uppercase tracking-widest mb-1.5">Файл .json</label>
                <input type="file" accept=".json" className="input text-sm w-full" onChange={e=>setJsonFile(e.target.files[0])}/>
                {jsonFile && <div className="text-xs text-success mt-1">✓ {jsonFile.name}</div>}
              </div>
              <div>
                <label className="block text-[11px] font-mono text-muted uppercase tracking-widest mb-1.5">Файл .session</label>
                <input type="file" accept=".session" className="input text-sm w-full" onChange={e=>setSesFile(e.target.files[0])}/>
                {sesFile && <div className="text-xs text-success mt-1">✓ {sesFile.name}</div>}
              </div>
            </div>
            <div className="flex gap-3">
              <button className="btn-primary flex-1 justify-center" onClick={importJson} disabled={importing}>{importing?'Импортируем...':'→ Импортировать'}</button>
              <button className="btn-ghost" onClick={()=>{setJsonOpen(false);setJsonFile(null);setSesFile(null)}}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk update modal */}
      <Modal open={bulkOpen} onClose={()=>setBulkOpen(false)} title={`Массовое обновление (${selected.length} акк.)`}>
        <FormField label="Роль (например: под_рассылку, инвайт, прогрев)">
          <input className="input" placeholder="под_рассылку" value={bulkRole} onChange={e=>setBulkRole(e.target.value)}/>
        </FormField>
        <FormField label="Папка">
          <input className="input" placeholder="Партия апрель 2026" value={bulkFolder} onChange={e=>setBulkFolder(e.target.value)}/>
        </FormField>
        <FormField label="ГЕО (RU, US, VN...)">
          <select className="input" value={bulkGeo} onChange={e=>setBulkGeo(e.target.value)}>
            <option value="">— не менять —</option>
            {Object.keys(GEO_FLAGS).map(g=><option key={g} value={g}>{GEO_FLAGS[g]} {g}</option>)}
          </select>
        </FormField>
        <button className="btn-primary w-full justify-center" onClick={handleBulkUpdate}><Tag size={14}/> Применить</button>
      </Modal>

      <Modal open={addOpen} onClose={()=>setAddOpen(false)} title="Добавить аккаунт">
        <FormField label="Телефон"><input className="input" placeholder="+79991234567" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></FormField>
        <FormField label="Лимит/день"><input className="input" type="number" value={form.dailyLimit} onChange={e=>setForm({...form,dailyLimit:+e.target.value})}/></FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Задержка мин"><input className="input" type="number" value={form.delayMin} onChange={e=>setForm({...form,delayMin:+e.target.value})}/></FormField>
          <FormField label="Задержка макс"><input className="input" type="number" value={form.delayMax} onChange={e=>setForm({...form,delayMax:+e.target.value})}/></FormField>
        </div>
        <button className="btn-primary w-full justify-center" onClick={handleAdd}><Plus size={14}/> Добавить</button>
      </Modal>

      <Modal open={proxyOpen} onClose={()=>setProxyOpen(false)} title="Добавить прокси">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2"><FormField label="Host"><input className="input" placeholder="192.168.1.1" value={proxyForm.host} onChange={e=>setProxyForm({...proxyForm,host:e.target.value})}/></FormField></div>
          <FormField label="Port"><input className="input" type="number" value={proxyForm.port} onChange={e=>setProxyForm({...proxyForm,port:e.target.value})}/></FormField>
        </div>
        <FormField label="Тип">
          <select className="input" value={proxyForm.proxyType} onChange={e=>setProxyForm({...proxyForm,proxyType:e.target.value})}>
            <option value="socks5">SOCKS5</option><option value="http">HTTP</option>
          </select>
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Login"><input className="input" value={proxyForm.username} onChange={e=>setProxyForm({...proxyForm,username:e.target.value})}/></FormField>
          <FormField label="Password"><input className="input" type="password" value={proxyForm.password} onChange={e=>setProxyForm({...proxyForm,password:e.target.value})}/></FormField>
        </div>
        <FormField label="Страна (RU, NL...)"><input className="input" placeholder="RU" value={proxyForm.country} onChange={e=>setProxyForm({...proxyForm,country:e.target.value.toUpperCase()})}/></FormField>
        <button className="btn-primary w-full justify-center" onClick={handleAddProxy}><Plus size={14}/> Добавить</button>
      </Modal>
    </Layout>
  )
}
