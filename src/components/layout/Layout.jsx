'use client'
// src/components/layout/Layout.jsx
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Radio, Globe, Send, Zap, Bot,
  Link2, BarChart3, Calculator, Flame, Users, Settings, Search, Bell, Shield, LogOut
} from 'lucide-react'

const NAV = [
  { label: 'Главное', items: [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Обзор',     badge: 'Live',  bc: 'green'  },
    { href: '/channels',  icon: Radio,           label: 'Каналы',   badge: null },
    { href: '/discover',  icon: Globe,           label: 'Поиск',    badge: 'New', bc: 'purple' },
  ]},
  { label: 'Работа', items: [
    { href: '/campaigns', icon: Send,      label: 'Рассылки',  badge: null },
    { href: '/offers',    icon: Zap,       label: 'Офферы',    badge: null },
    { href: '/funnels',   icon: Bot,       label: 'Воронки',   badge: null },
    { href: '/tracker',   icon: Link2,     label: 'Трекер',    badge: null },
    { href: '/analytics', icon: BarChart3, label: 'Аналитика', badge: null },
    { href: '/roi',       icon: Calculator,label: 'ROI',       badge: null },
  ]},
  { label: 'Система', items: [
    { href: '/warmup',    icon: Flame,    label: 'Прогрев',   badge: null },
    { href: '/accounts',  icon: Users,    label: 'Аккаунты',  badge: null },
    { href: '/spy',       icon: Search,   label: 'Шпион',     badge: 'New', bc: 'green' },
    { href: '/settings',  icon: Settings,     label: 'Настройки',  badge: null },
    { href: '/antiban',   icon: Shield,  label: 'Антибан',    badge: 'New' },
  ]},
]

const BC = {
  green:  'bg-success/10 text-success border border-success/25',
  purple: 'bg-accent3/10 text-purple-400 border border-accent3/25',
}

export function Sidebar() {
  const path = usePathname()
  const [me, setMe] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const { getMe } = await import('@/lib/supabase/getMe')
        const user = await getMe()
        setMe(user)
      } catch {}
    }
    load()
  }, [])

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[220px] bg-surface border-r border-border flex flex-col z-50">
      <div className="px-5 py-6 border-b border-border">
        <div className="text-2xl font-black tracking-tighter bg-gradient-to-r from-accent to-accent3 bg-clip-text text-transparent">
          TGArb
        </div>
        <div className="text-[10px] font-mono text-muted uppercase tracking-[3px] mt-0.5">
          Arbitrage Panel
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {NAV.map(s => (
          <div key={s.label}>
            <div className="text-[10px] font-mono text-muted uppercase tracking-[2px] px-2 mb-2">
              {s.label}
            </div>
            <div className="space-y-0.5">
              {s.items.map(item => {
                const active = item.href === '/' ? path === '/' : path.startsWith(item.href)
                return (
                  <Link key={item.href} href={item.href}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all
                      ${active
                        ? 'bg-accent/8 border border-accent/20 text-accent'
                        : 'text-muted hover:text-[#e8eaf0] hover:bg-surface2 border border-transparent'
                      }`}>
                    <item.icon size={15} />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${BC[item.bc]}`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}

        {/* Admin link — only for admins */}
        {me?.role === 'ADMIN' && (
          <div>
            <div className="text-[10px] font-mono text-muted uppercase tracking-[2px] px-2 mb-2">Управление</div>
            <div className="space-y-0.5">
              <Link href="/admin"
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all
                  ${path.startsWith('/admin')
                    ? 'bg-accent/8 border border-accent/20 text-accent'
                    : 'text-muted hover:text-[#e8eaf0] hover:bg-surface2 border border-transparent'
                  }`}>
                <Shield size={15}/>
                <span className="flex-1">Админ</span>
              </Link>
            </div>
          </div>
        )}
      </nav>

      <div className="px-5 py-4 border-t border-border">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-success pulse-dot" />
          <span className="text-xs font-mono text-muted">Сервис активен</span>
        </div>
      </div>
    </aside>
  )
}

export function Topbar({ title, subtitle, actions }) {
  const [unread, setUnread] = useState(0)
  const [user,   setUser]   = useState(null)
  const router = useRouter()

  useEffect(() => {
    import('@/lib/supabase/getMe').then(({ getMe }) => getMe()).then(u => setUser(u)).catch(()=>{})
    const load = () => fetch('/api/notifications')
      .then(r => r.json())
      .then(n => setUnread(Array.isArray(n) ? n.filter(x => !x.isRead).length : 0))
      .catch(() => {})
    load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-8 py-4
                        border-b border-border bg-bg/80 backdrop-blur-md">
      <div>
        <h1 className="text-lg font-black tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs font-mono text-muted mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <a href="/settings" className="relative btn-ghost px-3 py-2">
          <Bell size={16}/>
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center">
              {unread}
            </span>
          )}
        </a>
        {actions}
        {user && (
          <div className="flex items-center gap-2 pl-3 border-l border-border">
            <div className="w-7 h-7 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-black">
              {user.username[0].toUpperCase()}
            </div>
            <div className="text-xs">
              <div className="font-bold text-[#e8eaf0]">{user.username}</div>
              <div className="font-mono text-muted">{user.role}</div>
            </div>
            <button onClick={handleLogout} className="ml-1 text-muted hover:text-danger transition-colors" title="Выйти">
              <LogOut size={15}/>
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

export function Layout({ children }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-[220px] flex-1 relative z-10">{children}</main>
    </div>
  )
}
