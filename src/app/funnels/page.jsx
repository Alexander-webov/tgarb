'use client'
// src/app/funnels/page.jsx
import { useEffect, useState } from 'react'
import { Plus, Bot, Trash2, MessageSquare, HelpCircle, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import { Layout, Topbar } from '@/components/layout/Layout'
import { Modal, FormField, Badge, Spinner, Empty } from '@/components/ui'

const STEP_TYPES = [
  { id:'message',  label:'Сообщение', icon:MessageSquare, color:'#00e5ff', desc:'Бот отправляет текст' },
  { id:'question', label:'Вопрос',    icon:HelpCircle,    color:'#ff6b35', desc:'Вопрос с кнопками' },
  { id:'redirect', label:'Редирект',  icon:ExternalLink,  color:'#00ff9d', desc:'Перенаправить на оффер' },
]

const PRESETS = [
  { name:'Крипто оффер', steps:[
    {type:'message',  text:'👋 Привет! Знаешь как зарабатывать на крипте?', delay:0},
    {type:'question', text:'Есть ли опыт в трейдинге?', options:['Да, есть','Новичок','Хочу узнать'], delay:1},
    {type:'message',  text:'🔥 Отлично! У нас есть топовый оффер для тебя', delay:2},
    {type:'redirect', text:'Получить оффер →', url:'https://your-offer.com', delay:1},
  ]},
  { name:'Беттинг воронка', steps:[
    {type:'message',  text:'⚽ Привет! Ставишь на спорт?', delay:0},
    {type:'question', text:'Какой обычно бюджет?', options:['До 1000₽','1000-5000₽','5000₽+'], delay:1},
    {type:'message',  text:'💰 Бонус 200% на первый депозит!', delay:2},
    {type:'redirect', text:'Получить бонус →', url:'https://bet-offer.com', delay:1},
  ]},
]

function StepCard({ step, index, onUpdate, onDelete }) {
  const type = STEP_TYPES.find(t => t.id === step.type) || STEP_TYPES[0]
  const Icon = type.icon
  return (
    <div className="flex gap-3 mb-3">
      <div className="flex flex-col items-center">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0"
             style={{ background:`${type.color}18`, color:type.color }}>{index+1}</div>
        <div className="w-0.5 flex-1 mt-1" style={{background:`${type.color}30`}}/>
      </div>
      <div className="flex-1 card p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon size={13} style={{color:type.color}}/>
            <span className="text-xs font-mono font-bold" style={{color:type.color}}>{type.label}</span>
          </div>
          <button onClick={onDelete} className="text-muted hover:text-danger"><Trash2 size={12}/></button>
        </div>
        <textarea className="input resize-none text-xs mb-2 h-14"
          placeholder={type.id === 'redirect' ? 'Текст кнопки...' : 'Текст...'}
          value={step.text || ''} onChange={e => onUpdate({...step, text:e.target.value})}/>
        {step.type === 'question' && (
          <input className="input text-xs mb-2" placeholder="Да, Нет, Может быть"
            value={(step.options||[]).join(', ')}
            onChange={e => onUpdate({...step, options:e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})}/>
        )}
        {step.type === 'redirect' && (
          <input className="input text-xs mb-2" placeholder="https://your-offer.com"
            value={step.url||''} onChange={e => onUpdate({...step, url:e.target.value})}/>
        )}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-muted">Задержка:</span>
          <input type="number" className="input text-xs w-16 py-1" value={step.delay||0}
            onChange={e => onUpdate({...step, delay:+e.target.value})}/>
          <span className="text-[10px] font-mono text-muted">сек</span>
        </div>
      </div>
    </div>
  )
}

export default function Funnels() {
  const [funnels, setFunnels] = useState([])
  const [loading, setLoading] = useState(true)
  const [open,    setOpen]    = useState(false)
  const [form,    setForm]    = useState({ name:'', offerUrl:'', steps:[] })

  const load = async () => {
    setLoading(true)
    const f = await fetch('/api/funnels').then(r=>r.json()).catch(()=>[])
    setFunnels(f); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!form.name) { toast.error('Введи название'); return }
    const res = await fetch('/api/funnels', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) })
    if (res.ok) { toast.success('Воронка создана'); setOpen(false); load() }
    else toast.error('Ошибка')
  }

  return (
    <Layout>
      <Topbar title="Воронки" subtitle="Бот-прелендинги · grammY"
        actions={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={14}/> Создать воронку</button>}/>
      <div className="p-8">
        {loading ? <div className="flex justify-center py-16"><Spinner/></div>
        : funnels.length === 0 ? (
          <div className="space-y-4">
            <div className="card"><Empty icon={Bot} text="Нет воронок"
              action={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={14}/> Создать</button>}/></div>
            <div className="card p-5">
              <div className="font-bold text-sm mb-3">Как работают воронки</div>
              <div className="grid grid-cols-3 gap-4 text-xs text-muted">
                {['Пользователь пишет /start боту','Бот ведёт по шагам: вопросы → квалификация','Финал: редирект на оффер с UTM'].map((t,i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-black flex-shrink-0">{i+1}</div>
                    <span className="leading-relaxed">{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {funnels.map(f => (
              <div key={f.id} className="card p-5 hover:border-accent/20 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-bold text-sm">{f.name}</div>
                    <div className="text-xs font-mono text-muted mt-0.5">{(f.steps||[]).length} шагов</div>
                  </div>
                  <Badge color={f.isActive?'green':'purple'}>{f.isActive?'Активна':'Выкл'}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border">
                  <div><div className="text-xs font-mono text-muted">Старты</div><div className="text-sm font-bold text-accent">{f.totalStarts}</div></div>
                  <div><div className="text-xs font-mono text-muted">Завершено</div><div className="text-sm font-bold text-success">{f.totalDone}</div></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Конструктор воронки" wide>
        <div className="flex gap-2 mb-4">
          <span className="text-xs font-mono text-muted self-center">Пресеты:</span>
          {PRESETS.map(p => (
            <button key={p.name} className="btn-ghost text-xs px-3 py-1.5"
              onClick={() => setForm(f => ({...f, name:p.name, steps:p.steps}))}>
              {p.name}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-5">
          <div>
            <FormField label="Название"><input className="input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Крипто воронка #1"/></FormField>
            <FormField label="URL оффера (финал)"><input className="input" value={form.offerUrl} onChange={e=>setForm({...form,offerUrl:e.target.value})} placeholder="https://..."/></FormField>
            <div className="text-[11px] font-mono text-muted uppercase tracking-widest mb-2">Добавить шаг</div>
            <div className="flex flex-col gap-2">
              {STEP_TYPES.map(t => (
                <button key={t.id} onClick={() => setForm(f => ({...f, steps:[...f.steps,{type:t.id,text:'',delay:2}]}))}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-surface2 border border-border hover:border-accent/30 transition-all text-left">
                  <t.icon size={13} style={{color:t.color}}/>
                  <div><div className="text-xs font-bold" style={{color:t.color}}>{t.label}</div><div className="text-[10px] font-mono text-muted">{t.desc}</div></div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-mono text-muted uppercase tracking-widest mb-2">Шаги ({form.steps.length})</div>
            <div className="max-h-96 overflow-y-auto pr-1">
              {form.steps.length === 0
                ? <div className="text-xs font-mono text-muted text-center py-8 border border-dashed border-border rounded-xl">Добавь шаги слева →</div>
                : form.steps.map((step, i) => (
                  <StepCard key={i} step={step} index={i}
                    onUpdate={u => setForm(f => ({...f, steps:f.steps.map((s,idx)=>idx===i?u:s)}))}
                    onDelete={() => setForm(f => ({...f, steps:f.steps.filter((_,idx)=>idx!==i)}))}/>
                ))
              }
            </div>
          </div>
        </div>
        <button className="btn-primary w-full justify-center mt-4" onClick={handleCreate}><Bot size={14}/> Создать воронку</button>
      </Modal>
    </Layout>
  )
}
