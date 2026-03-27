'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-border">
        <div className="text-2xl font-black tracking-tighter bg-gradient-to-r from-accent to-accent3 bg-clip-text text-transparent">
          TGArb
        </div>
        <div className="flex gap-3">
          <Link href="/login" className="btn-ghost">Войти</Link>
          <Link href="/login" className="btn-primary">Начать →</Link>
        </div>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20">
        <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-full px-4 py-1.5 text-xs font-mono text-accent mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block"/>
          Платформа для Telegram арбитража
        </div>

        <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 leading-none">
          Управляй трафиком<br/>
          <span className="bg-gradient-to-r from-accent via-accent3 to-accent bg-clip-text text-transparent">
            как профессионал
          </span>
        </h1>

        <p className="text-lg text-muted max-w-xl mb-10 leading-relaxed">
          Парсинг каналов, умные рассылки, прогрев аккаунтов,
          CPA трекинг и аналитика — всё в одном месте.
        </p>

        <div className="flex gap-4 mb-16">
          <Link href="/login" className="btn-primary text-base px-8 py-3">
            Зарегистрироваться →
          </Link>
          <Link href="/login" className="btn-ghost text-base px-8 py-3">
            Войти
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl w-full">
          {[
            { icon:'📡', title:'Парсинг каналов',   desc:'Собирай аудиторию из любых Telegram каналов' },
            { icon:'🚀', title:'Умные рассылки',    desc:'Авто-ротация аккаунтов, защита от банов' },
            { icon:'🔥', title:'Прогрев аккаунтов', desc:'5-дневный автопрогрев с детектором бана' },
            { icon:'💰', title:'CPA интеграции',    desc:'Admitad, LeadGid, Alfaleads из коробки' },
            { icon:'📊', title:'Аналитика и ROI',   desc:'Считай прибыльность до запуска кампании' },
            { icon:'🕵️', title:'Шпион',             desc:'Следи за офферами конкурентов' },
          ].map(f => (
            <div key={f.title} className="card p-5 text-left hover:border-accent/30 transition-colors">
              <div className="text-2xl mb-2">{f.icon}</div>
              <div className="font-bold text-sm mb-1">{f.title}</div>
              <div className="text-xs text-muted leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <footer className="text-center py-6 text-xs font-mono text-muted border-t border-border">
        TGArb — Telegram Arbitrage Platform
      </footer>
    </div>
  )
}
