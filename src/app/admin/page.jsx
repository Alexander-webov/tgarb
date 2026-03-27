'use client'
// src/app/admin/page.jsx
import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Shield, Clock, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { Layout, Topbar } from '@/components/layout/Layout'
import { Badge } from '@/components/ui'

const ROLE_META = {
  ADMIN:   { label: 'Админ',    color: 'green'  },
  USER:    { label: 'Юзер',     color: 'blue'   },
  PENDING: { label: 'Ожидание', color: 'yellow' },
}

export default function AdminPage() {
  const [users,   setUsers]   = useState([])
  const [me,      setMe]      = useState(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const { createClient } = await import('@/lib/supabase/client')
    const { data: { session } } = await createClient().auth.getSession()
    const token = session?.access_token || ''
    const headers = { 'Authorization': `Bearer ${token}` }
    const [u, m] = await Promise.all([
      fetch('/api/users', { headers }).then(r => r.json()).catch(() => []),
      fetch('/api/auth/me', { headers }).then(r => r.json()).catch(() => ({})),
    ])
    setUsers(Array.isArray(u) ? u : [])
    setMe(m.user)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const handle = async (userId, action) => {
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const { data: { session } } = await createClient().auth.getSession()
      const res = await fetch('/api/users/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({ userId, action }),
      })
      if (res.ok) { toast.success('Готово'); load() }
      else toast.error('Ошибка ' + res.status)
    } catch (e) {
      toast.error('Ошибка: ' + e.message)
    }
  }

  if (me && me.role !== 'ADMIN') return (
    <Layout>
      <Topbar title="Администрирование"/>
      <div className="p-8 text-center text-muted font-mono text-sm">Доступ только для администраторов</div>
    </Layout>
  )

  const pending = users.filter(u => !u.isApproved || u.role === 'PENDING')
  const active  = users.filter(u => u.isApproved && u.role !== 'PENDING')

  return (
    <Layout>
      <Topbar title="Администрирование" subtitle={`${users.length} пользователей · ${pending.length} ожидают`}/>
      <div className="p-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Всего',     value: users.length,                icon: Users,        color: '#00e5ff' },
            { label: 'Ожидают',  value: pending.length,              icon: Clock,        color: '#ffd32a' },
            { label: 'Активных', value: active.length,               icon: CheckCircle2, color: '#00ff9d' },
          ].map(s => (
            <div key={s.label} className="card p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{background:`${s.color}18`}}>
                  <s.icon size={16} style={{color:s.color}}/>
                </div>
                <div>
                  <div className="text-2xl font-black" style={{color:s.color}}>{s.value}</div>
                  <div className="text-[10px] font-mono text-muted uppercase tracking-wider">{s.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pending approvals */}
        {pending.length > 0 && (
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <Clock size={15} className="text-warning"/>
              <span className="font-bold text-sm">Ожидают одобрения ({pending.length})</span>
            </div>
            <table className="w-full">
              <thead><tr className="border-b border-border">
                {['Пользователь','Email','Дата регистрации','Действие'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-muted uppercase tracking-wider">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-border">
                {pending.map(u => (
                  <tr key={u.id} className="hover:bg-surface2/50">
                    <td className="px-4 py-3 font-bold text-sm">{u.username}</td>
                    <td className="px-4 py-3 text-xs font-mono text-muted">{u.email}</td>
                    <td className="px-4 py-3 text-xs font-mono text-muted">
                      {new Date(u.createdAt).toLocaleString('ru-RU')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button className="btn-primary text-xs px-3 py-1.5"
                          onClick={() => handle(u.id, 'approve')}>
                          <CheckCircle2 size={12}/> Одобрить
                        </button>
                        <button className="btn-ghost text-xs px-3 py-1.5 hover:border-danger hover:text-danger"
                          onClick={() => handle(u.id, 'reject')}>
                          <XCircle size={12}/> Отклонить
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* All users */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-border font-bold text-sm">Все пользователи</div>
          <table className="w-full">
            <thead><tr className="border-b border-border">
              {['Пользователь','Email','Роль','Дата','Действия'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-muted uppercase tracking-wider">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-border">
              {users.map(u => {
                const rm = ROLE_META[u.role] || ROLE_META.PENDING
                const isMe = me?.id === u.id
                return (
                  <tr key={u.id} className={`hover:bg-surface2/50 ${isMe ? 'bg-accent/3' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-black">
                          {u.username[0].toUpperCase()}
                        </div>
                        <span className="font-bold text-sm">{u.username}</span>
                        {isMe && <span className="text-[10px] font-mono text-accent">(вы)</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-muted">{u.email}</td>
                    <td className="px-4 py-3"><Badge color={rm.color}>{rm.label}</Badge></td>
                    <td className="px-4 py-3 text-xs font-mono text-muted">
                      {new Date(u.createdAt).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-4 py-3">
                      {!isMe && (
                        <div className="flex gap-1.5">
                          {u.role !== 'ADMIN' && (
                            <button className="btn-ghost text-xs px-2 py-1"
                              onClick={() => handle(u.id, 'admin')}>
                              <Shield size={11}/> Сделать админом
                            </button>
                          )}
                          {u.isApproved && u.role !== 'ADMIN' && (
                            <button className="btn-ghost text-xs px-2 py-1 hover:border-danger hover:text-danger"
                              onClick={() => handle(u.id, 'reject')}>
                              <XCircle size={11}/> Заблокировать
                            </button>
                          )}
                          {!u.isApproved && (
                            <button className="btn-primary text-xs px-2 py-1"
                              onClick={() => handle(u.id, 'approve')}>
                              <CheckCircle2 size={11}/> Одобрить
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  )
}
