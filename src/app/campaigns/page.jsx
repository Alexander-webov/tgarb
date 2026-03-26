'use client'
import { useEffect, useState } from 'react'
import { Plus, Play, Pause, Trash2, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import { Layout, Topbar } from '@/components/layout/Layout'
import { Modal, FormField, Badge, ProgressBar, Spinner, Empty } from '@/components/ui'

const STATUS = {
  DRAFT:     { label: 'Черновик',  color: 'purple' },
  RUNNING:   { label: 'Идёт',      color: 'blue'   },
  PAUSED:    { label: 'Пауза',     color: 'yellow' },
  DONE:      { label: 'Готово',    color: 'green'  },
  FAILED:    { label: 'Ошибка',    color: 'red'    },
  SCHEDULED: { label: 'Запланир.', color: 'yellow' },
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([])
  const [channels,  setChannels]  = useState([])
  const [accounts,  setAccounts]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [open,      setOpen]      = useState(false)
  const [form, setForm] = useState({
    name: '', campaignType: 'DM', messageText: '',
    targetChannels: [], senderAccountIds: [],
    maxRecipients: '', delayBetween: 30, offerUrl: '',
  })

  const load = async () => {
    setLoading(true)
    const [c, ch, ac] = await Promise.all([
      fetch('/api/campaigns').then(r => r.json()).catch(() => []),
      fetch('/api/channels').then(r => r.json()).catch(() => []),
      fetch('/api/accounts').then(r => r.json()).catch(() => []),
    ])
    setCampaigns(c); setChannels(ch); setAccounts(ac); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!form.name || !form.messageText) { toast.error('Заполни название и текст'); return }
    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, maxRecipients: form.maxRecipients ? +form.maxRecipients : null }),
    })
    if (res.ok) { toast.success('Кампания создана'); setOpen(false); load() }
    else toast.error('Ошибка')
  }

  const handleStart = async (id) => {
    await fetch(`/api/campaigns/${id}/start`, { method: 'POST' })
    toast.success('Рассылка запущена!'); load()
  }
  const handlePause = async (id) => {
    await fetch(`/api/campaigns/${id}/pause`, { method: 'POST' })
    toast('На паузе'); load()
  }
  const handleDelete = async (id) => {
    await fetch(`/api/campaigns/${id}`, { method: 'DELETE' })
    toast.success('Удалено'); load()
  }

  const toggleChannel = (u) => setForm(f => ({
    ...f, targetChannels: f.targetChannels.includes(u)
      ? f.targetChannels.filter(c => c !== u)
      : [...f.targetChannels, u]
  }))

  return (
    <Layout>
      <Topbar title="Рассылки" subtitle={`${campaigns.filter(c=>c.status==='RUNNING').length} активных`}
        actions={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={14}/> Новая рассылка</button>}/>
      <div className="p-8">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner/></div>
        ) : campaigns.length === 0 ? (
          <div className="card"><Empty icon={Send} text="Рассылок нет"
            action={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={14}/> Создать</button>}/></div>
        ) : (
          <div className="space-y-3">
            {campaigns.map(camp => {
              const st = STATUS[camp.status] || STATUS.DRAFT
              return (
                <div key={camp.id} className="card p-5 hover:border-accent/20 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-bold">{camp.name}</span>
                        <Badge color={st.color}>{st.label}</Badge>
                        <span className="text-xs font-mono text-muted">{camp.campaignType}</span>
                      </div>
                      <p className="text-xs text-muted mb-3 line-clamp-1">{camp.messageText}</p>
                      {camp.sentCount > 0 && (
                        <div className="flex gap-4 text-xs font-mono">
                          <span className="text-muted">Отправлено: <span className="text-[#e8eaf0]">{camp.sentCount}</span></span>
                          <span className="text-muted">Доставлено: <span className="text-success">{camp.deliveredCount}</span></span>
                          <span className="text-muted">Ошибок: <span className="text-danger">{camp.failedCount}</span></span>
                        </div>
                      )}
                      {camp.status === 'RUNNING' && (
                        <ProgressBar value={camp.deliveredCount} max={camp.maxRecipients || 100} color="#00e5ff" className="mt-3"/>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {(camp.status === 'DRAFT' || camp.status === 'PAUSED') && (
                        <button className="btn-primary text-xs px-3 py-1.5" onClick={() => handleStart(camp.id)}>
                          <Play size={12}/> Запустить
                        </button>
                      )}
                      {camp.status === 'RUNNING' && (
                        <button className="btn-ghost text-xs px-3 py-1.5" onClick={() => handlePause(camp.id)}>
                          <Pause size={12}/> Пауза
                        </button>
                      )}
                      <button className="btn-ghost text-xs px-3 py-1.5 hover:border-danger hover:text-danger"
                              onClick={() => handleDelete(camp.id)}><Trash2 size={12}/></button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Новая рассылка" wide>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FormField label="Название">
              <input className="input" placeholder="Крипта оффер #1" value={form.name}
                     onChange={e => setForm({...form, name: e.target.value})}/>
            </FormField>
            <FormField label="Тип">
              <select className="input" value={form.campaignType} onChange={e => setForm({...form, campaignType: e.target.value})}>
                <option value="DM">💬 Личные сообщения</option>
                <option value="COMMENT">💭 Комментарии</option>
                <option value="INVITE">👥 Инвайтинг</option>
                <option value="POST">📢 Постинг</option>
              </select>
            </FormField>
            <FormField label="Текст сообщения">
              <textarea className="input resize-none h-28" placeholder="Текст..." value={form.messageText}
                        onChange={e => setForm({...form, messageText: e.target.value})}/>
            </FormField>
            <FormField label="URL оффера">
              <input className="input" placeholder="https://..." value={form.offerUrl}
                     onChange={e => setForm({...form, offerUrl: e.target.value})}/>
            </FormField>
          </div>
          <div>
            <FormField label={`Каналы-источники (${form.targetChannels.length})`}>
              <div className="border border-border rounded-lg max-h-40 overflow-y-auto divide-y divide-border">
                {channels.slice(0,20).map(ch => (
                  <label key={ch.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-surface2">
                    <input type="checkbox" className="accent-accent"
                           checked={form.targetChannels.includes(ch.username)}
                           onChange={() => toggleChannel(ch.username)}/>
                    <span className="text-xs font-mono">@{ch.username}</span>
                    {ch.subscribers && <span className="text-[10px] text-muted ml-auto">{(ch.subscribers/1000).toFixed(0)}K</span>}
                  </label>
                ))}
              </div>
            </FormField>
            <FormField label="Аккаунт (или авто)">
              <select className="input" value={form.senderAccountIds[0] || ''}
                      onChange={e => setForm({...form, senderAccountIds: e.target.value ? [+e.target.value] : []})}>
                <option value="">Авто (ротация)</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.username ? `@${a.username}` : a.phone}</option>
                ))}
              </select>
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Макс. получателей">
                <input className="input" type="number" placeholder="Все" value={form.maxRecipients}
                       onChange={e => setForm({...form, maxRecipients: e.target.value})}/>
              </FormField>
              <FormField label="Задержка (сек)">
                <input className="input" type="number" value={form.delayBetween}
                       onChange={e => setForm({...form, delayBetween: +e.target.value})}/>
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
