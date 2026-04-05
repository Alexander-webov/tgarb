'use client'
import { useEffect, useState } from 'react'
import { Plus, Play, Trash2, Eye, Heart, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import { Layout, Topbar } from '@/components/layout/Layout'
import { Modal, FormField, Badge, Spinner, Empty } from '@/components/ui'
import { checkAccount } from '@/lib/accountCheck'

export default function Stories() {
  const [tasks,    setTasks]    = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [open,     setOpen]     = useState(false)
  const [form,     setForm]     = useState({ name:'', mode:'view', limitPerAcc:100, accountIds:[] })

  const load = async () => {
    setLoading(true)
    const [t, a] = await Promise.all([
      fetch('/api/stories').then(r=>r.json()).catch(()=>[]),
      fetch('/api/accounts').then(r=>r.json()).catch(()=>[]),
    ])
    setTasks(Array.isArray(t)?t:[]); setAccounts(Array.isArray(a)?a:[]); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!form.name) { toast.error('Укажи название'); return }
    const res = await fetch('/api/stories', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) })
    if (res.ok) { toast.success('Задача создана'); setOpen(false); load() }
    else toast.error('Ошибка')
  }

  const handleStart = async (id) => {
    const check = checkAccount(accounts)
    if (!check.ok) { toast.error(check.error); return }
    await fetch(`/api/stories/${id}/start`, { method:'POST' })
    toast.success('Масслайкинг запущен!')
    setTimeout(load, 3000)
  }

  const toggleAcc = (id) => setForm(f => ({
    ...f, accountIds: f.accountIds.includes(id) ? f.accountIds.filter(a=>a!==id) : [...f.accountIds, id]
  }))

  return (
    <Layout>
      <Topbar title="Масслайкинг сторис" subtitle="Просмотр и лайки сторис пользователей"
        actions={<button className="btn-primary" onClick={()=>setOpen(true)}><Plus size={14}/> Новая задача</button>}/>
      <div className="p-8 space-y-4">
        <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 flex gap-3">
          <Info size={16} className="text-accent mt-0.5 flex-shrink-0"/>
          <div className="text-xs text-muted leading-relaxed">
            <span className="text-[#e8eaf0] font-bold">Масслайкинг сторис</span> — аккаунты просматривают и лайкают сторис спарсенных пользователей. В результате люди видят кто смотрел их сторис и открывают профиль — это трафик без спама. Лимит: 100-200 просмотров в день на аккаунт.
          </div>
        </div>
        {loading ? <div className="flex justify-center py-16"><Spinner/></div>
        : tasks.length === 0 ? (
          <div className="card"><Empty icon={Eye} text="Нет задач"
            action={<button className="btn-primary" onClick={()=>setOpen(true)}><Plus size={14}/> Создать</button>}/></div>
        ) : (
          <div className="space-y-3">
            {tasks.map(t => (
              <div key={t.id} className="card p-5">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold">{t.name}</span>
                      <Badge color={t.status==='DONE'?'green':t.status==='RUNNING'?'blue':'purple'}>
                        {t.status==='DONE'?'Готово':t.status==='RUNNING'?'Идёт':'Черновик'}
                      </Badge>
                      <span className="text-xs font-mono text-muted bg-surface2 px-2 py-0.5 rounded">
                        {t.mode==='view'?'Просмотры':t.mode==='like'?'Лайки':'Просмотры + Лайки'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div className="bg-surface2 rounded-lg px-3 py-2 flex items-center gap-2">
                        <Eye size={14} className="text-accent"/><div>
                          <div className="text-lg font-black">{t.viewed}</div>
                          <div className="text-[10px] font-mono text-muted">Просмотров</div>
                        </div>
                      </div>
                      <div className="bg-surface2 rounded-lg px-3 py-2 flex items-center gap-2">
                        <Heart size={14} className="text-danger"/><div>
                          <div className="text-lg font-black">{t.liked}</div>
                          <div className="text-[10px] font-mono text-muted">Лайков</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {t.status === 'DRAFT' && (
                      <button className="btn-primary text-xs px-4 py-2" onClick={()=>handleStart(t.id)}>
                        <Play size={12}/> Запустить
                      </button>
                    )}
                    <button className="btn-ghost text-xs px-4 py-2 hover:border-danger hover:text-danger"
                      onClick={async()=>{ await fetch(`/api/stories/${t.id}`,{method:'DELETE'}); load() }}>
                      <Trash2 size={12}/>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Modal open={open} onClose={()=>setOpen(false)} title="Новая задача масслайкинга">
        <FormField label="Название">
          <input className="input" placeholder="Крипто-лайкинг" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
        </FormField>
        <FormField label="Режим">
          <select className="input" value={form.mode} onChange={e=>setForm({...form,mode:e.target.value})}>
            <option value="view">👁 Только просмотры</option>
            <option value="like">❤️ Только лайки</option>
            <option value="both">👁❤️ Просмотры + Лайки</option>
          </select>
        </FormField>
        <FormField label="Лимит на аккаунт/день">
          <input className="input" type="number" value={form.limitPerAcc} onChange={e=>setForm({...form,limitPerAcc:+e.target.value})}/>
          <div className="text-[10px] font-mono text-muted mt-1">Рекомендуем 100-200 в день</div>
        </FormField>
        <FormField label={`Аккаунты (${form.accountIds.length})`}>
          <div className="border border-border rounded-lg max-h-36 overflow-y-auto divide-y divide-border">
            {accounts.filter(a=>a.status==='ACTIVE').map(a => (
              <label key={a.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-surface2">
                <input type="checkbox" className="accent-accent" checked={form.accountIds.includes(a.id)} onChange={()=>toggleAcc(a.id)}/>
                <span className="text-xs font-mono">{a.phone}</span>
              </label>
            ))}
          </div>
        </FormField>
        <button className="btn-primary w-full justify-center" onClick={handleCreate}><Plus size={14}/> Создать</button>
      </Modal>
    </Layout>
  )
}
