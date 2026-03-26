'use client'
import { useEffect, useState } from 'react'
import { Plus, RefreshCw, ExternalLink, Link2, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { Layout, Topbar } from '@/components/layout/Layout'
import { Modal, FormField, Badge, Spinner, Empty } from '@/components/ui'

const NET = {
  own:       { label: 'Own',       color: '#a78bfa' },
  admitad:   { label: 'Admitad',   color: '#00e5ff' },
  leadgid:   { label: 'LeadGid',   color: '#00ff9d' },
  alfaleads: { label: 'Alfaleads', color: '#ff6b35' },
}

export default function Offers() {
  const [offers,   setOffers]   = useState([])
  const [networks, setNetworks] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [syncing,  setSyncing]  = useState(false)
  const [filter,   setFilter]   = useState('all')
  const [addOpen,  setAddOpen]  = useState(false)
  const [linkModal,setLinkModal]= useState(null)
  const [form, setForm] = useState({ name:'', destinationUrl:'', payout:'', payoutType:'CPA', currency:'USD', category:'' })

  const load = async () => {
    setLoading(true)
    const [o, n] = await Promise.all([
      fetch('/api/offers').then(r=>r.json()).catch(()=>[]),
      fetch('/api/cpa/networks').then(r=>r.json()).catch(()=>[]),
    ])
    setOffers(o); setNetworks(n); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const handleSync = async () => {
    setSyncing(true)
    toast.loading('Синхронизируем...', { id: 'sync' })
    await fetch('/api/cpa/sync', { method: 'POST' })
    setTimeout(() => { load(); setSyncing(false); toast.success('Готово!', { id: 'sync' }) }, 2500)
  }

  const handleCreate = async () => {
    const res = await fetch('/api/offers', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, payout: form.payout ? +form.payout : null }),
    })
    if (res.ok) { toast.success('Оффер добавлен'); setAddOpen(false); load() }
    else toast.error('Ошибка')
  }

  const handleCreateLink = async (offer) => {
    const res = await fetch('/api/tracker/links', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destinationUrl: offer.destinationUrl, offerId: offer.id }),
    })
    if (res.ok) {
      const data = await res.json()
      setLinkModal({ url: data.shortUrl, name: offer.name })
    }
  }

  const filtered = filter === 'all' ? offers : offers.filter(o => o.network === filter)

  return (
    <Layout>
      <Topbar title="Офферы" subtitle={`${offers.length} офферов`}
        actions={
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={handleSync} disabled={syncing}>
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''}/> Синхронизировать
            </button>
            <button className="btn-primary" onClick={() => setAddOpen(true)}><Plus size={14}/> Свой оффер</button>
          </div>
        }/>
      <div className="p-8">
        {/* Networks */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {networks.map(n => (
            <div key={n.id} className={`card p-4 ${n.connected ? 'border-success/20' : ''}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{n.icon}</span>
                <span className="font-bold text-sm">{n.name}</span>
              </div>
              <Badge color={n.connected ? 'green' : 'purple'}>{n.connected ? 'Подключено' : 'Настроить'}</Badge>
              {!n.connected && n.setupUrl && (
                <a href={n.setupUrl} target="_blank" rel="noopener noreferrer"
                   className="text-[10px] font-mono text-accent mt-2 block hover:underline">Получить ключ →</a>
              )}
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-5">
          {['all','own','admitad','leadgid','alfaleads'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all
                ${filter === f ? 'bg-accent/10 border border-accent/30 text-accent' : 'bg-surface2 border border-border text-muted hover:text-[#e8eaf0]'}`}>
              {f === 'all' ? 'Все' : f}
              <span className="ml-1.5 text-[10px] opacity-60">
                {f === 'all' ? offers.length : offers.filter(o=>o.network===f).length}
              </span>
            </button>
          ))}
        </div>

        {loading ? <div className="flex justify-center py-16"><Spinner/></div>
        : filtered.length === 0 ? (
          <div className="card"><Empty icon={Zap} text="Нет офферов — нажми Синхронизировать"
            action={<button className="btn-ghost" onClick={handleSync}><RefreshCw size={14}/> Синхронизировать</button>}/></div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {filtered.map(o => {
              const net = NET[o.network] || NET.own
              return (
                <div key={o.id} className="card p-4 hover:border-accent/20 transition-colors flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm mb-1 truncate">{o.name}</div>
                      <div className="text-xs text-muted line-clamp-2">{o.description || '—'}</div>
                    </div>
                    <div className="ml-2 px-2 py-0.5 rounded text-[10px] font-mono font-bold"
                         style={{ color: net.color, background: `${net.color}18` }}>{net.label}</div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {o.category && <Badge color="purple">{o.category}</Badge>}
                    <Badge color="blue">{o.payoutType}</Badge>
                  </div>
                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-border">
                    <div className="text-lg font-black text-success">
                      ${o.payout ?? '—'}<span className="text-xs font-mono text-muted ml-1">{o.currency}</span>
                    </div>
                    <div className="flex gap-2">
                      {o.destinationUrl && (
                        <a href={o.destinationUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost text-xs px-2.5 py-1.5">
                          <ExternalLink size={12}/>
                        </a>
                      )}
                      <button className="btn-primary text-xs px-3 py-1.5" onClick={() => handleCreateLink(o)}>
                        <Link2 size={12}/> UTM
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Добавить оффер" wide>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FormField label="Название"><input className="input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Название"/></FormField>
            <FormField label="Destination URL"><input className="input" value={form.destinationUrl} onChange={e=>setForm({...form,destinationUrl:e.target.value})} placeholder="https://..."/></FormField>
          </div>
          <div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Выплата"><input className="input" type="number" value={form.payout} onChange={e=>setForm({...form,payout:e.target.value})} placeholder="0"/></FormField>
              <FormField label="Тип">
                <select className="input" value={form.payoutType} onChange={e=>setForm({...form,payoutType:e.target.value})}>
                  <option>CPA</option><option>CPL</option><option>CPI</option><option>RevShare</option>
                </select>
              </FormField>
            </div>
            <FormField label="Категория">
              <select className="input" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>
                <option value="">— выбрать —</option>
                <option>Crypto</option><option>Gambling</option><option>Finance</option><option>Nutra</option>
              </select>
            </FormField>
          </div>
        </div>
        <button className="btn-primary w-full justify-center mt-2" onClick={handleCreate}><Zap size={14}/> Добавить</button>
      </Modal>

      <Modal open={!!linkModal} onClose={() => setLinkModal(null)} title="UTM-ссылка создана">
        <div className="text-xs text-muted mb-2">{linkModal?.name}</div>
        <div className="bg-surface2 border border-accent/20 rounded-lg p-3 font-mono text-sm text-accent break-all mb-4">{linkModal?.url}</div>
        <div className="flex gap-2">
          <button className="btn-primary flex-1 justify-center" onClick={() => { navigator.clipboard.writeText(linkModal?.url); toast.success('Скопировано!') }}>Скопировать</button>
          <button className="btn-ghost" onClick={() => setLinkModal(null)}>Закрыть</button>
        </div>
      </Modal>
    </Layout>
  )
}
