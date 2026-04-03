'use client'
// src/app/discover/page.jsx
import { useState, useEffect } from 'react'
import { Search, Globe, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { checkAccount } from '@/lib/accountCheck'
import { Layout, Topbar } from '@/components/layout/Layout'
import { FormField, Badge, Spinner, Empty } from '@/components/ui'

const CATEGORIES = [
  { id:'crypto',    label:'₿ Крипта',    color:'#00e5ff' },
  { id:'gambling',  label:'🎰 Гемблинг',  color:'#ff6b35' },
  { id:'arbitrage', label:'📊 Арбитраж',  color:'#00ff9d' },
  { id:'finance',   label:'💰 Финансы',   color:'#ffd32a' },
  { id:'nutra',     label:'💊 Нутра',     color:'#a78bfa' },
]

export default function Discover() {
  const [query,     setQuery]     = useState('')
  const [results,   setResults]   = useState([])
  const [loading,   setLoading]   = useState(false)
  const [accounts,  setAccounts]  = useState([])
  const [accountId, setAccountId] = useState('')

  useEffect(() => {
    fetch('/api/accounts').then(r=>r.json())
      .then(a => { setAccounts(a); if (a[0]) setAccountId(a[0].id) })
      .catch(()=>{})
  }, [])

  const handleSearch = async () => {
    const check = checkAccount(accounts)
    if (!check.ok) { toast.error(check.error); return }

    if (!query.trim() || !accountId) { toast.error('Выбери аккаунт и введи запрос'); return }
    setLoading(true)
    const res = await fetch(`/api/channels/discover/search?query=${encodeURIComponent(query)}&account_id=${accountId}`)
    const data = await res.json()
    setResults(data.channels || [])
    if (!data.channels?.length) toast('Ничего не найдено')
    setLoading(false)
  }

  const handleAdd = async (ch) => {
    await fetch('/api/channels', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ username: ch.username, category: ch.category }),
    })
    toast.success(`@${ch.username} добавлен!`)
  }

  return (
    <Layout>
      <Topbar title="Поиск каналов" subtitle="Разведка ниш"/>
      <div className="p-8">
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-1 space-y-4">
            <div className="card p-4">
              <FormField label="Аккаунт для поиска">
                <select className="input" value={accountId} onChange={e=>setAccountId(+e.target.value)}>
                  <option value="">— выбрать —</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.username?`@${a.username}`:a.phone}</option>)}
                </select>
              </FormField>
            </div>
            <div className="card p-4">
              <div className="text-xs font-mono text-muted uppercase tracking-widest mb-3">По запросу</div>
              <div className="flex gap-2">
                <input className="input flex-1" placeholder="крипта, btc..."
                       value={query} onChange={e=>setQuery(e.target.value)}
                       onKeyDown={e => e.key === 'Enter' && handleSearch()}/>
                <button className="btn-primary px-3" onClick={handleSearch}><Search size={14}/></button>
              </div>
            </div>
            <div className="card p-4">
              <div className="text-xs font-mono text-muted uppercase tracking-widest mb-3">По нише</div>
              <div className="space-y-2">
                {CATEGORIES.map(cat => (
                  <button key={cat.id}
                    onClick={async () => {
                      if (!accountId) { toast.error('Выбери аккаунт'); return }
                      setLoading(true)
                      const res = await fetch(`/api/channels/discover/search?query=${cat.id}&account_id=${accountId}&limit=30`)
                      const data = await res.json()
                      setResults(data.channels || [])
                      setLoading(false)
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-surface2 border border-border hover:border-accent/30 transition-all text-sm font-semibold">
                    <span>{cat.label}</span>
                    <span className="text-xs font-mono" style={{color:cat.color}}>→</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="col-span-2">
            <div className="text-xs font-mono text-muted uppercase tracking-widest mb-3">
              {loading ? 'Поиск...' : results.length > 0 ? `Найдено ${results.length} каналов` : 'Результаты'}
            </div>
            {loading ? <div className="flex justify-center py-20"><Spinner/></div>
            : results.length === 0 ? (
              <div className="card"><Empty icon={Globe} text="Введи запрос или выбери нишу"/></div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {results.map((ch, i) => (
                  <div key={i} className="card p-4 hover:border-accent/20 transition-colors">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-9 h-9 rounded-xl bg-accent/10 text-accent flex items-center justify-center text-sm font-black flex-shrink-0">
                        {(ch.title||ch.username||'?')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm truncate">{ch.title||ch.username}</div>
                        <div className="text-xs font-mono text-muted">@{ch.username}</div>
                      </div>
                      <button className="btn-primary text-xs px-2.5 py-1.5 flex-shrink-0" onClick={() => handleAdd(ch)}>
                        <Plus size={11}/>
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-surface2 rounded-lg p-2 text-center">
                        <div className="text-xs font-mono font-bold text-[#e8eaf0]">
                          {ch.subscribers ? `${(ch.subscribers/1000).toFixed(0)}K` : '—'}
                        </div>
                        <div className="text-[10px] font-mono text-muted">подписчики</div>
                      </div>
                      <div className="bg-surface2 rounded-lg p-2 text-center">
                        <div className="text-xs font-mono font-bold text-success">
                          {ch.isBroadcast ? 'Канал' : 'Группа'}
                        </div>
                        <div className="text-[10px] font-mono text-muted">тип</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
