'use client'
// src/app/tracker/page.jsx
import { useEffect, useState } from 'react'
import { Plus, Copy, Link2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Layout, Topbar } from '@/components/layout/Layout'
import { Modal, FormField, StatCard } from '@/components/ui'
import { MousePointer, Users, DollarSign } from 'lucide-react'

export default function TrackerPage() {
  const [links,  setLinks]  = useState([])
  const [stats,  setStats]  = useState(null)
  const [open,   setOpen]   = useState(false)
  const [form,   setForm]   = useState({ destinationUrl:'', channelUsername:'' })

  const load = async () => {
    const [l, s] = await Promise.all([
      fetch('/api/tracker/links').then(r=>r.json()).catch(()=>[]),
      fetch('/api/tracker/stats').then(r=>r.json()).catch(()=>null),
    ])
    setLinks(l); setStats(s)
  }
  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    const res = await fetch('/api/tracker/links', {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(form),
    })
    if (res.ok) { toast.success('Ссылка создана'); setOpen(false); load() }
    else toast.error('Ошибка')
  }

  return (
    <Layout>
      <Topbar title="Трекер" subtitle="UTM-ссылки · Клики · Постбэки"
        actions={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={14}/> Создать ссылку</button>}/>
      <div className="p-8 space-y-5">
        {stats && (
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Кликов"      value={stats.clicks}      icon={MousePointer} accent="#00e5ff"/>
            <StatCard label="Конверсий"   value={stats.conversions} icon={Users}        accent="#00ff9d"/>
            <StatCard label="Выручка"     value={`$${stats.revenue}`} icon={DollarSign} accent="#a78bfa"/>
          </div>
        )}
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-border">
              {['Slug','Destination','Клики',''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-muted uppercase tracking-wider">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-border">
              {links.map(l => (
                <tr key={l.id} className="hover:bg-surface2/50">
                  <td className="px-4 py-3 font-mono text-xs text-accent">{l.slug}</td>
                  <td className="px-4 py-3 text-xs text-muted max-w-xs truncate">{l.destinationUrl}</td>
                  <td className="px-4 py-3 font-mono text-xs text-success">{l.clicks}</td>
                  <td className="px-4 py-3">
                    <button className="btn-ghost text-xs px-2 py-1"
                      onClick={() => {
                        const url = `${window.location.origin}/r/${l.slug}`
                        navigator.clipboard.writeText(url)
                        toast.success('Скопировано!')
                      }}><Copy size={12}/></button>
                  </td>
                </tr>
              ))}
              {links.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-12 text-center text-xs font-mono text-muted">Нет ссылок</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="card p-5">
          <div className="text-sm font-bold mb-2">Постбэк URL для CPA-сетей</div>
          <div className="bg-surface2 rounded-lg p-3 font-mono text-xs text-accent break-all">
            {typeof window !== 'undefined' ? window.location.origin : 'https://yourdomain.com'}/api/postback?sub_id={'{sub_id}'}&event=lead&payout={'{payout}'}
          </div>
        </div>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Создать UTM-ссылку">
        <FormField label="Destination URL">
          <input className="input" placeholder="https://your-offer.com/..." value={form.destinationUrl}
                 onChange={e=>setForm({...form,destinationUrl:e.target.value})}/>
        </FormField>
        <FormField label="Канал (опционально)">
          <input className="input" placeholder="@cryptowhales" value={form.channelUsername}
                 onChange={e=>setForm({...form,channelUsername:e.target.value})}/>
        </FormField>
        <button className="btn-primary w-full justify-center" onClick={handleCreate}><Link2 size={14}/> Создать</button>
      </Modal>
    </Layout>
  )
}
