'use client'
import { useEffect, useState } from 'react'
import { Plus, Trash2, MessageSquare, Info, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { Layout, Topbar } from '@/components/layout/Layout'
import { Modal, FormField, Badge, Toggle, Spinner, Empty } from '@/components/ui'

export default function AutoReply() {
  const [replies,  setReplies]  = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [open,     setOpen]     = useState(false)
  const [expanded, setExpanded] = useState({})
  const [form,     setForm]     = useState({
    name: '', accountId: '', steps: [
      { trigger: 'any', message: 'Привет! Чем могу помочь?', delay: 2 },
    ]
  })

  const load = async () => {
    setLoading(true)
    const [r, a] = await Promise.all([
      fetch('/api/autoreply').then(r=>r.json()).catch(()=>[]),
      fetch('/api/accounts').then(r=>r.json()).catch(()=>[]),
    ])
    setReplies(Array.isArray(r)?r:[]); setAccounts(Array.isArray(a)?a:[]); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!form.name || !form.accountId) { toast.error('Заполни название и аккаунт'); return }
    const res = await fetch('/api/autoreply', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ ...form, accountId: +form.accountId })
    })
    if (res.ok) { toast.success('Автоответчик создан'); setOpen(false); load() }
    else toast.error('Ошибка')
  }

  const toggleActive = async (r) => {
    await fetch('/api/autoreply', {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ id: r.id, isActive: !r.isActive, steps: r.steps })
    })
    toast.success(r.isActive ? 'Автоответчик выключен' : 'Автоответчик включён')
    load()
  }

  const addStep = () => setForm(f => ({ ...f, steps: [...f.steps, { trigger: 'any', message: '', delay: 5 }] }))
  const updateStep = (i, field, val) => setForm(f => ({ ...f, steps: f.steps.map((s,j) => j===i ? {...s,[field]:val} : s) }))
  const removeStep = (i) => setForm(f => ({ ...f, steps: f.steps.filter((_,j)=>j!==i) }))

  return (
    <Layout>
      <Topbar title="Автоответчик" subtitle="Автоматические ответы на входящие сообщения"
        actions={<button className="btn-primary" onClick={()=>setOpen(true)}><Plus size={14}/> Новый</button>}/>
      <div className="p-8 space-y-4">
        <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 flex gap-3">
          <Info size={16} className="text-accent mt-0.5 flex-shrink-0"/>
          <div className="text-xs text-muted leading-relaxed">
            <span className="text-[#e8eaf0] font-bold">Автоответчик</span> отвечает на входящие сообщения по заданному сценарию. Каждый шаг — это сообщение которое отправляется с задержкой. Можно настроить триггер: <code className="text-accent">any</code> — на любое сообщение, или ключевое слово.
            <br/>⚠️ Работает через Telegram бота (грамми) — нужен активный BOT_TOKEN в настройках Railway.
          </div>
        </div>

        {loading ? <div className="flex justify-center py-16"><Spinner/></div>
        : replies.length === 0 ? (
          <div className="card"><Empty icon={MessageSquare} text="Нет автоответчиков"
            action={<button className="btn-primary" onClick={()=>setOpen(true)}><Plus size={14}/> Создать</button>}/></div>
        ) : (
          <div className="space-y-3">
            {replies.map(r => {
              const acc = accounts.find(a=>a.id===r.accountId)
              return (
                <div key={r.id} className="card overflow-hidden">
                  <div className="p-5 flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-bold">{r.name}</span>
                        <Badge color={r.isActive?'green':'purple'}>{r.isActive?'Активен':'Выключен'}</Badge>
                      </div>
                      <div className="text-xs font-mono text-muted">
                        Аккаунт: {acc?.phone || '—'} · {r.steps.length} шагов
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Toggle checked={r.isActive} onChange={()=>toggleActive(r)}/>
                      <button className="btn-ghost text-xs px-3 py-1.5"
                        onClick={()=>setExpanded(p=>({...p,[r.id]:!p[r.id]}))}>
                        {expanded[r.id]?<ChevronUp size={13}/>:<ChevronDown size={13}/>}
                      </button>
                      <button className="btn-ghost text-xs px-3 py-1.5 hover:border-danger hover:text-danger"
                        onClick={async()=>{ await fetch(`/api/autoreply/${r.id}`,{method:'DELETE'}); load() }}>
                        <Trash2 size={13}/>
                      </button>
                    </div>
                  </div>
                  {expanded[r.id] && (
                    <div className="border-t border-border p-5 bg-surface2/30">
                      <div className="text-[10px] font-mono text-muted uppercase mb-3">Сценарий:</div>
                      <div className="space-y-2">
                        {(r.steps||[]).map((step, i) => (
                          <div key={i} className="flex gap-3 items-start bg-surface2 rounded-lg p-3">
                            <div className="w-6 h-6 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-black flex-shrink-0">{i+1}</div>
                            <div className="flex-1">
                              <div className="text-[10px] font-mono text-muted mb-1">
                                Триггер: <span className="text-accent">{step.trigger==='any'?'любое сообщение':step.trigger}</span> · Задержка: {step.delay}с
                              </div>
                              <div className="text-xs text-[#e8eaf0]">{step.message}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Modal open={open} onClose={()=>setOpen(false)} title="Новый автоответчик" wide>
        <FormField label="Название">
          <input className="input" placeholder="Воронка крипта" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
        </FormField>
        <FormField label="Аккаунт">
          <select className="input" value={form.accountId} onChange={e=>setForm({...form,accountId:e.target.value})}>
            <option value="">— выбрать —</option>
            {accounts.filter(a=>a.status==='ACTIVE').map(a=>(
              <option key={a.id} value={a.id}>{a.phone}</option>
            ))}
          </select>
        </FormField>
        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold">Шаги сценария</div>
            <button className="btn-ghost text-xs" onClick={addStep}><Plus size={12}/> Добавить шаг</button>
          </div>
          {form.steps.map((step, i) => (
            <div key={i} className="bg-surface2 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">Шаг {i+1}</span>
                {form.steps.length > 1 && (
                  <button className="text-xs text-danger" onClick={()=>removeStep(i)}>Удалить</button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Триггер">
                  <input className="input text-sm" placeholder="any или ключевое слово" value={step.trigger}
                    onChange={e=>updateStep(i,'trigger',e.target.value)}/>
                </FormField>
                <FormField label="Задержка (сек)">
                  <input className="input text-sm" type="number" value={step.delay}
                    onChange={e=>updateStep(i,'delay',+e.target.value)}/>
                </FormField>
              </div>
              <FormField label="Текст сообщения">
                <textarea className="input resize-none h-20 text-sm" value={step.message}
                  onChange={e=>updateStep(i,'message',e.target.value)}
                  placeholder="Привет! Хочешь узнать подробнее?"/>
              </FormField>
            </div>
          ))}
        </div>
        <button className="btn-primary w-full justify-center" onClick={handleCreate}><Plus size={14}/> Создать автоответчик</button>
      </Modal>
    </Layout>
  )
}
