'use client'
import { useEffect, useState } from 'react'
import { Plus, Upload, Wifi, Trash2, RefreshCw, CheckCircle2, AlertTriangle, WifiOff, Key } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Layout, Topbar } from '@/components/layout/Layout'
import { Modal, FormField, Badge, ProgressBar, Toggle, Spinner, Empty } from '@/components/ui'

const STATUS_META = {
  ACTIVE:  { label: 'Активен', color: 'green',  icon: CheckCircle2 },
  WARMING: { label: 'Прогрев', color: 'yellow', icon: RefreshCw },
  LIMITED: { label: 'Лимит',   color: 'yellow', icon: AlertTriangle },
  BANNED:  { label: 'Бан',     color: 'red',    icon: WifiOff },
  OFFLINE: { label: 'Офлайн', color: 'purple', icon: WifiOff },
}

export default function Accounts() {
  const [accounts, setAccounts] = useState([])
  const [proxies,  setProxies]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [addOpen,  setAddOpen]  = useState(false)
  const [jsonOpen, setJsonOpen] = useState(false)
  const [jsonFile, setJsonFile] = useState(null)
  const [sesFile,  setSesFile]  = useState(null)
  const [importing,setImporting]= useState(false)
  const [proxyOpen,setProxyOpen]= useState(false)
  const [form,     setForm]     = useState({ phone:'', dailyLimit:50, delayMin:20, delayMax:60 })
  const [proxyForm,setProxyForm]= useState({ host:'', port:1080, proxyType:'socks5', username:'', password:'', country:'' })

  const handleSpamCheck = async (id) => {
    setChecking(p => ({...p, [id]: true}))
    toast.loading('Проверяем SpamBot...', { id: `sc-${id}` })
    const res = await fetch('/api/accounts/spamcheck', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ accountIds: [id] })
    })
    const data = await res.json()
    toast.dismiss(`sc-${id}`)
    setChecking(p => ({...p, [id]: false}))
    const r = data.results?.[0]
    if (r) {
      setCheckResult(p => ({...p, [id]: r}))
      if (r.status === 'clean') toast.success(`✅ ${r.phone}: Без спамблока`)
      else if (r.status === 'limited') toast.error(`⚠️ Ограничен SpamBot`, { duration: 8000 })
      else if (r.status === 'banned') toast.error(`🚫 Забанен!`, { duration: 8000 })
      else toast.error(r.detail || 'Ошибка', { duration: 6000 })
    }
    load()
  }

  const load = async () => {
    setLoading(true)
    const [a, p] = await Promise.all([
      fetch('/api/accounts').then(r => r.json()).catch(() => []),
      fetch('/api/proxies').then(r => r.json()).catch(() => []),
    ])
    setAccounts(a); setProxies(p); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const handleAdd = async () => {
    const res = await fetch('/api/accounts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) { toast.success('Аккаунт добавлен'); setAddOpen(false); load() }
    else toast.error('Ошибка')
  }

  const handleConnect = async (id) => {
    await fetch(`/api/accounts/${id}/connect`, { method: 'POST' })
    toast.success('Подключение...'); setTimeout(load, 2000)
  }

  const handleUpload = async (id, file) => {
    const fd = new FormData(); fd.append('file', file)
    await fetch(`/api/accounts/${id}/session`, { method: 'POST', body: fd })
    toast.success('Session загружен!'); load()
  }

  const handleDelete = async (id) => {
    await fetch(`/api/accounts/${id}`, { method: 'DELETE' })
    toast.success('Удалён'); load()
  }

  const handleAddProxy = async () => {
    const res = await fetch('/api/proxies', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...proxyForm, port: +proxyForm.port }),
    })
    if (res.ok) { toast.success('Прокси добавлен'); setProxyOpen(false); load() }
    else toast.error('Ошибка')
  }

  const importJson = async () => {
    if (!jsonFile || !sesFile) { toast.error('Загрузи оба файла'); return }
    setImporting(true)
    const fd = new FormData()
    fd.append('json', jsonFile)
    fd.append('session', sesFile)
    const res = await fetch('/api/accounts/import-json', { method: 'POST', body: fd })
    const data = await res.json()
    setImporting(false)
    if (res.ok) {
      toast.success(data.message)
      setJsonOpen(false); setJsonFile(null); setSesFile(null)
      load()
    } else toast.error(data.error || 'Ошибка')
  }

  return (
    <Layout>
      <Topbar
        title="Аккаунты"
        subtitle={`${accounts.filter(a => a.status === 'ACTIVE').length} активных`}
        actions={
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => setProxyOpen(true)}><Plus size={14}/> Прокси</button>
            <Link href="/accounts/session-gen" className="btn-ghost"><Key size={14}/> Генератор Session</Link>
            <button className="btn-ghost" onClick={() => setJsonOpen(true)}><Upload size={14}/> Импорт JSON</button>
            <button className="btn-primary" onClick={() => setAddOpen(true)}><Plus size={14}/> Аккаунт</button>
          </div>
        }
      />
      <div className="p-8">
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-2 space-y-3">
            {loading ? (
              <div className="flex justify-center py-12"><Spinner /></div>
            ) : accounts.length === 0 ? (
              <div className="card">
                <Empty icon={WifiOff} text="Нет аккаунтов"
                  action={<button className="btn-primary" onClick={() => setAddOpen(true)}><Plus size={14}/> Добавить</button>}/>
              </div>
            ) : accounts.map(acc => {
              const st = STATUS_META[acc.status] || STATUS_META.OFFLINE
              const pct = acc.dailyLimit > 0 ? (acc.sentToday / acc.dailyLimit) * 100 : 0
              const barColor = pct > 80 ? '#ff4757' : pct > 50 ? '#ffd32a' : '#00ff9d'
              return (
                <div key={acc.id} className="card p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent3 to-accent flex items-center justify-center text-sm font-black text-black flex-shrink-0">
                    {(acc.username || acc.phone || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-sm">{acc.username ? `@${acc.username}` : acc.phone}</span>
                      <Badge color={st.color}>{st.label}</Badge>
                      {acc.isWarmed && <Badge color="green">Прогрет</Badge>}
                    </div>
                    <div className="text-xs font-mono text-muted mb-2">{acc.phone} · Лимит {acc.dailyLimit}/д</div>
                    <div className="flex items-center gap-2">
                      <ProgressBar value={acc.sentToday} max={acc.dailyLimit} color={barColor} className="flex-1"/>
                      <span className="text-[10px] font-mono text-muted">{acc.sentToday}/{acc.dailyLimit}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <label className="cursor-pointer">
                      <input type="file" className="hidden" accept=".session"
                        onChange={e => e.target.files[0] && handleUpload(acc.id, e.target.files[0])}/>
                      <span className="btn-ghost text-xs px-3 py-1.5 cursor-pointer"><Upload size={13}/> Session</span>
                    </label>
                    <button className="btn-ghost text-xs px-3 py-1.5" onClick={() => handleConnect(acc.id)} title="Подключить"><Wifi size={13}/></button>
                    <button className="btn-ghost text-xs px-3 py-1.5" onClick={() => handleSpamCheck(acc.id)} disabled={checking[acc.id]} title="Проверить SpamBot">
                      {checking[acc.id] ? '⏳' : '🛡'}
                    </button>
                    <button className="btn-ghost text-xs px-3 py-1.5 hover:border-danger hover:text-danger" onClick={() => handleDelete(acc.id)}><Trash2 size={13}/></button>
                  </div>
                  {/* Proxy selector */}
                  {proxies.length > 0 && (
                    <div className="mt-2">
                      <select className="input text-[11px] py-1 w-full" value={acc.proxyId || ''}
                        onChange={async e => {
                          await fetch('/api/accounts', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ ids: [acc.id], proxyId: e.target.value ? +e.target.value : null })
                          })
                          toast.success(e.target.value ? 'Прокси привязан' : 'Прокси отвязан')
                          load()
                        }}>
                        <option value="">🔓 Без прокси</option>
                        {proxies.map(p => (
                          <option key={p.id} value={p.id}>
                            🔒 {p.country || '??'} — {p.host}:{p.port} ({p.proxyType})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="space-y-4">
            <div className="card">
              <div className="px-4 py-3 border-b border-border text-sm font-bold">Прокси ({proxies.length})</div>
              <div className="p-3 space-y-2 max-h-60 overflow-y-auto">
                {proxies.length === 0 ? (
                  <p className="text-xs font-mono text-muted text-center py-3">Нет прокси</p>
                ) : proxies.map(p => (
                  <div key={p.id} className="flex items-center justify-between bg-surface2 rounded-lg px-3 py-2">
                    <div>
                      <div className="text-xs font-bold">{p.country || '??'}-{p.proxyType.toUpperCase()}</div>
                      <div className="text-[10px] font-mono text-muted">{p.host}:{p.port}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge color={p.isActive ? 'green' : 'red'}>{p.isActive ? 'OK' : 'Down'}</Badge>
                      <button className="text-muted hover:text-danger"
                        onClick={async () => { await fetch(`/api/proxies/${p.id}`, { method: 'DELETE' }); load() }}>
                        <Trash2 size={13}/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card p-4">
              <div className="text-sm font-bold mb-3">Антидетект</div>
              {[['Авто-ротация', true], ['Рандомные задержки', true], ['Авто-замена при бане', true]].map(([l, v]) => (
                <div key={l} className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted">{l}</span>
                  <Toggle checked={v} onChange={() => {}}/>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* JSON Import Modal */}
      {jsonOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6">
            <div className="text-base font-black mb-5">Импорт из JSON + Session</div>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-[11px] font-mono text-muted uppercase tracking-widest mb-1.5">Файл .json (метаданные)</label>
                <input type="file" accept=".json" className="input text-sm w-full"
                  onChange={e => setJsonFile(e.target.files[0])}/>
                {jsonFile && <div className="text-xs text-success mt-1">✓ {jsonFile.name}</div>}
              </div>
              <div>
                <label className="block text-[11px] font-mono text-muted uppercase tracking-widest mb-1.5">Файл .session (Telethon/TGManager)</label>
                <input type="file" accept=".session" className="input text-sm w-full"
                  onChange={e => setSesFile(e.target.files[0])}/>
                {sesFile && <div className="text-xs text-success mt-1">✓ {sesFile.name}</div>}
              </div>
              <div className="text-xs font-mono text-muted bg-surface2 rounded-lg p-3 leading-relaxed">
                Загрузи оба файла с одинаковым именем (номер телефона).<br/>
                Формат: TGManager, Somiibo, Telethon.
              </div>
            </div>
            <div className="flex gap-3">
              <button className="btn-primary flex-1 justify-center" onClick={importJson} disabled={importing}>
                {importing ? 'Импортируем...' : '→ Импортировать'}
              </button>
              <button className="btn-ghost" onClick={() => { setJsonOpen(false); setJsonFile(null); setSesFile(null) }}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Добавить аккаунт">
        <FormField label="Телефон">
          <input className="input" placeholder="+79991234567" value={form.phone}
            onChange={e => setForm({...form, phone: e.target.value})}/>
        </FormField>
        <FormField label="Лимит/день">
          <input className="input" type="number" value={form.dailyLimit}
            onChange={e => setForm({...form, dailyLimit: +e.target.value})}/>
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Задержка мин">
            <input className="input" type="number" value={form.delayMin}
              onChange={e => setForm({...form, delayMin: +e.target.value})}/>
          </FormField>
          <FormField label="Задержка макс">
            <input className="input" type="number" value={form.delayMax}
              onChange={e => setForm({...form, delayMax: +e.target.value})}/>
          </FormField>
        </div>
        <button className="btn-primary w-full justify-center" onClick={handleAdd}><Plus size={14}/> Добавить</button>
      </Modal>

      <Modal open={proxyOpen} onClose={() => setProxyOpen(false)} title="Добавить прокси">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <FormField label="Host">
              <input className="input" placeholder="192.168.1.1" value={proxyForm.host}
                onChange={e => setProxyForm({...proxyForm, host: e.target.value})}/>
            </FormField>
          </div>
          <FormField label="Port">
            <input className="input" type="number" value={proxyForm.port}
              onChange={e => setProxyForm({...proxyForm, port: e.target.value})}/>
          </FormField>
        </div>
        <FormField label="Тип">
          <select className="input" value={proxyForm.proxyType}
            onChange={e => setProxyForm({...proxyForm, proxyType: e.target.value})}>
            <option value="socks5">SOCKS5</option>
            <option value="http">HTTP</option>
          </select>
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Login">
            <input className="input" value={proxyForm.username}
              onChange={e => setProxyForm({...proxyForm, username: e.target.value})}/>
          </FormField>
          <FormField label="Password">
            <input className="input" type="password" value={proxyForm.password}
              onChange={e => setProxyForm({...proxyForm, password: e.target.value})}/>
          </FormField>
        </div>
        <FormField label="Страна (RU, NL...)">
          <input className="input" placeholder="RU" value={proxyForm.country}
            onChange={e => setProxyForm({...proxyForm, country: e.target.value.toUpperCase()})}/>
        </FormField>
        <button className="btn-primary w-full justify-center" onClick={handleAddProxy}><Plus size={14}/> Добавить</button>
      </Modal>
    </Layout>
  )
}
