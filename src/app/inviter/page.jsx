'use client'
import { useEffect, useState } from 'react'
import { Plus, Play, Trash2, Users, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import { Layout, Topbar } from '@/components/layout/Layout'
import { Modal, FormField, Badge, Spinner, Empty } from '@/components/ui'
import { checkAccount } from '@/lib/accountCheck'

const STATUS = {
  DRAFT:   { label: 'Черновик', color: 'purple' },
  RUNNING: { label: 'Идёт',     color: 'blue'   },
  DONE:    { label: 'Готово',   color: 'green'  },
  PAUSED:  { label: 'Пауза',    color: 'yellow' },
}

export default function Inviter() {
  const [tasks,    setTasks]    = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [open,     setOpen]     = useState(false)
  const [form,     setForm]     = useState({ name:'', targetChat:'', limitPerAcc:25, delaySeconds:10, accountIds:[] })

  const load = async () => {
    setLoading(true)
    const [t, a] = await Promise.all([
      fetch('/api/inviter').then(r=>r.json()).catch(()=>[]),
      fetch('/api/accounts').then(r=>r.json()).catch(()=>[]),
    ])
    setTasks(Array.isArray(t)?t:[]); setAccounts(Array.isArray(a)?a:[]); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!form.targetChat) { toast.error('Укажи чат для инвайта'); return }
    const res = await fetch('/api/inviter', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) })
    if (res.ok) { toast.success('Задача создана'); setOpen(false); load() }
    else toast.error('Ошибка')
  }

  const handleStart = async (id) => {
    const check = checkAccount(accounts)
    if (!check.ok) { toast.error(check.error); return }
    await fetch(`/api/inviter/${id}/start`, { method:'POST' })
    toast.success('Инвайтер запущен! Воркер начнёт работу через ~10 сек.')
    setTimeout(load, 3000)
  }

  const toggleAcc = (id) => setForm(f => ({
    ...f, accountIds: f.accountIds.includes(id) ? f.accountIds.filter(a=>a!==id) : [...f.accountIds, id]
  }))

  return (
    <Layout>
      <Topbar title="Инвайтер" subtitle="Массовое добавление пользователей в чаты"
        actions={<button className="btn-primary" onClick={()=>setOpen(true)}><Plus size={14}/> Новая задача</button>}/>
      <div className="p-8 space-y-4">
        <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 flex gap-3">
          <Info size={16} className="text-accent mt-0.5 flex-shrink-0"/>
          <div className="text-xs text-muted leading-relaxed">
            <span className="text-[#e8eaf0] font-bold">Инвайтер</span> добавляет спарсенных пользователей в указанный чат. Лимит — 25-50 инвайтов на аккаунт в день. Аккаунт должен быть администратором чата или иметь право приглашать участников.
          </div>
        </div>
        {loading ? <div className="flex justify-center py-16"><Spinner/></div>
        : tasks.length === 0 ? (
          <div className="card"><Empty icon={Users} text="Нет задач инвайтинга"
            action={<button className="btn-primary" onClick={()=>setOpen(true)}><Plus size={14}/> Создать</button>}/></div>
        ) : (
          <div className="space-y-3">
            {tasks.map(t => {
              const st = STATUS[t.status] || STATUS.DRAFT
              const pct = t.accountIds.length > 0 ? Math.round(t.invited / (t.limitPerAcc * t.accountIds.length) * 100) : 0
              return (
                <div key={t.id} className="card p-5">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold">{t.name}</span>
                        <Badge color={st.color}>{st.label}</Badge>
                      </div>
                      <div className="text-xs font-mono text-muted mb-3">@{t.targetChat} · {t.accountIds.length} аккаунтов · лимит {t.limitPerAcc}/акк · задержка {t.delaySeconds}с</div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-surface2 rounded-lg px-3 py-2 text-center">
                          <div className="text-xl font-black text-success">{t.invited}</div>
                          <div className="text-[10px] font-mono text-muted">Приглашено</div>
                        </div>
                        <div className="bg-surface2 rounded-lg px-3 py-2 text-center">
                          <div className="text-xl font-black text-danger">{t.failed}</div>
                          <div className="text-[10px] font-mono text-muted">Ошибок</div>
                        </div>
                        <div className="bg-surface2 rounded-lg px-3 py-2 text-center">
                          <div className="text-xl font-black text-accent">{pct}%</div>
                          <div className="text-[10px] font-mono text-muted">Прогресс</div>
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
                        onClick={async()=>{ await fetch(`/api/inviter/${t.id}`,{method:'DELETE'}); load() }}>
                        <Trash2 size={12}/>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Modal open={open} onClose={()=>setOpen(false)} title="Новая задача инвайтинга">
        <FormField label="Название">
          <input className="input" placeholder="Инвайт в крипто-чат" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
        </FormField>
        <FormField label="Username чата (куда инвайтим)">
          <input className="input" placeholder="@mychat или mychat" value={form.targetChat}
            onChange={e=>setForm({...form,targetChat:e.target.value.replace('@','')})}/>
          <div className="text-[10px] font-mono text-muted mt-1">⚠️ Аккаунт должен быть администратором этого чата</div>
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Лимит инвайтов/аккаунт">
            <input className="input" type="number" value={form.limitPerAcc} onChange={e=>setForm({...form,limitPerAcc:+e.target.value})}/>
            <div className="text-[10px] font-mono text-muted mt-1">Рекомендуем 20-30/день</div>
          </FormField>
          <FormField label="Задержка (сек)">
            <input className="input" type="number" value={form.delaySeconds} onChange={e=>setForm({...form,delaySeconds:+e.target.value})}/>
          </FormField>
        </div>
        <FormField label={`Аккаунты (${form.accountIds.length} выбрано)`}>
          <div className="border border-border rounded-lg max-h-40 overflow-y-auto divide-y divide-border">
            {accounts.filter(a=>a.status==='ACTIVE').map(a => (
              <label key={a.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-surface2">
                <input type="checkbox" className="accent-accent" checked={form.accountIds.includes(a.id)} onChange={()=>toggleAcc(a.id)}/>
                <span className="text-xs font-mono">{a.phone}</span>
                <span className="text-[10px] text-muted ml-auto">{a.sentToday}/{a.dailyLimit}/д</span>
              </label>
            ))}
          </div>
        </FormField>
        <button className="btn-primary w-full justify-center" onClick={handleCreate}><Plus size={14}/> Создать задачу</button>
      </Modal>
    </Layout>
  )
}
