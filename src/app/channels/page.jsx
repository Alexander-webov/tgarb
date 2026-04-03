'use client'
// src/app/channels/page.jsx
import { useEffect, useState } from 'react'
import { Plus, Trash2, Download, Search, Radio } from 'lucide-react'
import toast from 'react-hot-toast'
import { Layout, Topbar } from '@/components/layout/Layout'
import { Modal, FormField, Badge, Toggle, Spinner, Empty } from '@/components/ui'

const CAT_COLOR = { crypto:'blue', gambling:'red', arbitrage:'green', finance:'yellow', other:'purple' }

export function ChannelsPage() {
  const [channels,  setChannels]  = useState([])
  const [accounts,  setAccounts]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [open,      setOpen]      = useState(false)
  const [search,    setSearch]    = useState('')
  const [form,      setForm]      = useState({ username:'', category:'', isMonitored:true, isParsing:false })

  const handleToggle = async (id, field, value) => {
    await fetch(`/api/channels/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    })
    load()
  }

  const load = async () => {
    setLoading(true)
    const [ch, ac] = await Promise.all([
      fetch('/api/channels').then(r=>r.json()).catch(()=>[]),
      fetch('/api/accounts').then(r=>r.json()).catch(()=>[]),
    ])
    setChannels(ch); setAccounts(ac); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const handleAdd = async () => {
    const res = await fetch('/api/channels', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(form) })
    if (res.ok) { toast.success('Канал добавлен'); setOpen(false); load() }
    else toast.error('Ошибка')
  }

  const handleParse = async (id) => {
    const acc = accounts.find(a => a.status === 'ACTIVE')
    if (!acc) { toast.error('Нет активных аккаунтов'); return }
    await fetch(`/api/channels/${id}/parse-members?account_id=${acc.id}&limit=5000`, { method:'POST' })
    toast.success('Парсинг запущен')
  }

  const filtered = channels.filter(c => !search || c.username.includes(search) || (c.title||'').toLowerCase().includes(search.toLowerCase()))

  return (
    <Layout>
      <Topbar title="Каналы" subtitle={`${channels.length} каналов`}
        actions={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={14}/> Добавить</button>}/>
      <div className="p-8">
        <div className="flex gap-3 mb-5">
          <div className="relative max-w-sm flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"/>
            <input className="input pl-9" placeholder="Поиск..." value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
        </div>
        {loading ? <div className="flex justify-center py-16"><Spinner/></div>
        : filtered.length === 0 ? (
          <div className="card"><Empty icon={Radio} text="Нет каналов"
            action={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={14}/> Добавить</button>}/></div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-border">
                {['Канал','Категория','Подписчики','ER','Постов/д','Монитор','Парсинг',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-muted uppercase tracking-wider">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-border">
                {filtered.map(ch => (
                  <tr key={ch.id} className="hover:bg-surface2/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-accent/10 text-accent flex items-center justify-center text-xs font-black">
                          {ch.username[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-semibold">@{ch.username}</div>
                          {ch.title && <div className="text-[10px] font-mono text-muted">{ch.title}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{ch.category ? <Badge color={CAT_COLOR[ch.category]||'purple'}>{ch.category}</Badge> : '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs">{ch.subscribers ? `${(ch.subscribers/1000).toFixed(0)}K` : '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-success">{ch.erPercent != null ? `${ch.erPercent}%` : '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-accent">{ch.postsPerDay ?? '—'}</td>
                    <td className="px-4 py-3"><Toggle checked={ch.isMonitored} onChange={v=>handleToggle(ch.id,'isMonitored',v)}/></td>
                    <td className="px-4 py-3"><Toggle checked={ch.isParsing} onChange={v=>handleToggle(ch.id,'isParsing',v)}/></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button className="btn-ghost text-xs px-2 py-1" onClick={() => handleParse(ch.id)}><Download size={12}/></button>
                        <button className="btn-ghost text-xs px-2 py-1 hover:border-danger hover:text-danger"
                                onClick={async () => { await fetch(`/api/channels/${ch.id}`,{method:'DELETE'}); load() }}><Trash2 size={12}/></button>
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
        <FormField label="Username">
          <input className="input" placeholder="@cryptowhales" value={form.username} onChange={e=>setForm({...form,username:e.target.value})}/>
        </FormField>
        <FormField label="Категория">
          <select className="input" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>
            <option value="">— выбрать —</option>
            <option value="crypto">Крипта</option><option value="gambling">Гемблинг</option>
            <option value="arbitrage">Арбитраж</option><option value="finance">Финансы</option>
          </select>
        </FormField>
        <button className="btn-primary w-full justify-center" onClick={handleAdd}><Plus size={14}/> Добавить</button>
      </Modal>
    </Layout>
  )
}

export default ChannelsPage
