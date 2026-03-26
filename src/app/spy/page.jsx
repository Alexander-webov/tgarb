'use client'
// src/app/spy/page.jsx
import { useEffect, useState } from 'react'
import { Eye, Search, RefreshCw, ExternalLink, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { Layout, Topbar } from '@/components/layout/Layout'
import { FormField, Badge, Spinner, Empty } from '@/components/ui'

export default function SpyPage() {
  const [posts,    setPosts]    = useState([])
  const [channels, setChannels] = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [scanning, setScanning] = useState(false)
  const [filter,   setFilter]   = useState('')
  const [selectedCh, setSelectedCh] = useState('')
  const [accountId,  setAccountId]  = useState('')

  const load = async () => {
    setLoading(true)
    const [p, ch, ac] = await Promise.all([
      fetch('/api/spy').then(r => r.json()).catch(() => []),
      fetch('/api/channels').then(r => r.json()).catch(() => []),
      fetch('/api/accounts').then(r => r.json()).catch(() => []),
    ])
    setPosts(p); setChannels(ch); setAccounts(ac)
    if (ac[0]) setAccountId(ac[0].id)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const handleScan = async () => {
    if (!selectedCh || !accountId) { toast.error('Выбери канал и аккаунт'); return }
    setScanning(true)
    toast.loading('Сканируем канал...', { id: 'scan' })
    await fetch('/api/spy/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelUsername: selectedCh, accountId: +accountId, limit: 100 }),
    })
    setTimeout(() => {
      load()
      setScanning(false)
      toast.success('Сканирование завершено!', { id: 'scan' })
    }, 5000)
  }

  const filtered = filter
    ? posts.filter(p => p.advertiser?.includes(filter) || p.text?.toLowerCase().includes(filter.toLowerCase()))
    : posts

  // Top advertisers
  const advertiserStats = posts.reduce((acc, p) => {
    if (p.advertiser) acc[p.advertiser] = (acc[p.advertiser] || 0) + 1
    return acc
  }, {})
  const topAdvertisers = Object.entries(advertiserStats)
    .sort(([,a],[,b]) => b - a)
    .slice(0, 10)

  return (
    <Layout>
      <Topbar
        title="Шпион конкурентов"
        subtitle={`${posts.length} рекламных постов найдено`}
        actions={
          <button className="btn-ghost" onClick={load}>
            <RefreshCw size={14}/> Обновить
          </button>
        }
      />
      <div className="p-8 space-y-5">
        {/* Controls */}
        <div className="card p-5">
          <div className="grid grid-cols-4 gap-4">
            <FormField label="Аккаунт для сканирования">
              <select className="input" value={accountId} onChange={e => setAccountId(e.target.value)}>
                <option value="">— выбрать —</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.username ? `@${a.username}` : a.phone}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Канал для сканирования">
              <select className="input" value={selectedCh} onChange={e => setSelectedCh(e.target.value)}>
                <option value="">— выбрать из списка —</option>
                {channels.map(c => (
                  <option key={c.id} value={c.username}>@{c.username}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Фильтр по рекламодателю">
              <input className="input" placeholder="binance.com..." value={filter}
                     onChange={e => setFilter(e.target.value)}/>
            </FormField>
            <FormField label="Действие">
              <button className="btn-primary w-full justify-center" onClick={handleScan} disabled={scanning}>
                <Eye size={14}/>{scanning ? 'Сканируем...' : 'Сканировать канал'}
              </button>
            </FormField>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-5">
          {/* Top advertisers */}
          <div className="card">
            <div className="px-4 py-3 border-b border-border font-bold text-sm">Топ рекламодателей</div>
            <div className="p-3 space-y-1.5">
              {topAdvertisers.length === 0
                ? <p className="text-xs font-mono text-muted text-center py-4">Нет данных</p>
                : topAdvertisers.map(([adv, count]) => (
                  <div key={adv} className="flex items-center justify-between bg-surface2 rounded-lg px-3 py-2 cursor-pointer hover:bg-surface/80"
                       onClick={() => setFilter(adv)}>
                    <span className="text-xs font-mono text-accent truncate">{adv}</span>
                    <span className="text-xs font-bold text-[#e8eaf0] ml-2">{count}</span>
                  </div>
                ))
              }
            </div>
          </div>

          {/* Ad posts list */}
          <div className="col-span-3 space-y-3">
            {loading ? (
              <div className="flex justify-center py-16"><Spinner/></div>
            ) : filtered.length === 0 ? (
              <div className="card">
                <Empty icon={Eye}
                  text="Нет рекламных постов. Выбери канал и нажми Сканировать."
                  action={
                    <div className="text-xs font-mono text-muted mt-2">
                      Система автоматически определяет рекламные посты по маркерам и ссылкам
                    </div>
                  }
                />
              </div>
            ) : filtered.map(post => (
              <div key={post.id} className="card p-4 hover:border-accent/20 transition-colors">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge color="blue">@{post.channel?.username}</Badge>
                    {post.advertiser && (
                      <Badge color="green">{post.advertiser}</Badge>
                    )}
                    {post.views && (
                      <span className="text-[10px] font-mono text-muted">{post.views.toLocaleString()} просмотров</span>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {post.offerUrl && (
                      <a href={post.offerUrl} target="_blank" rel="noopener noreferrer"
                         className="btn-ghost text-xs px-2.5 py-1.5">
                        <ExternalLink size={12}/> Оффер
                      </a>
                    )}
                    {post.offerUrl && (
                      <button className="btn-primary text-xs px-2.5 py-1.5"
                        onClick={async () => {
                          await fetch('/api/offers', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              name: `Spy: ${post.advertiser || post.offerUrl}`,
                              destinationUrl: post.offerUrl,
                              network: 'own',
                            }),
                          })
                          toast.success('Оффер добавлен в реестр!')
                        }}>
                        <Plus size={12}/> В офферы
                      </button>
                    )}
                  </div>
                </div>

                {/* Ad text */}
                <p className="text-xs text-muted leading-relaxed line-clamp-4 mb-2">
                  {post.text}
                </p>

                {/* Offer URL */}
                {post.offerUrl && (
                  <div className="bg-surface2 rounded-lg px-3 py-1.5 font-mono text-xs text-accent break-all">
                    {post.offerUrl}
                  </div>
                )}

                <div className="text-[10px] font-mono text-muted mt-2">
                  {new Date(post.detectedAt).toLocaleString('ru-RU')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}
