'use client'
// src/components/ui/index.jsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Loader2 } from 'lucide-react'

export function StatCard({ label, value, delta, deltaUp, accent = '#00e5ff', icon: Icon }) {
  return (
    <div className="stat-card animate-fade-up">
      <div className="absolute top-0 right-0 w-16 h-16 rounded-bl-full opacity-10"
           style={{ background: accent }}/>
      {Icon && (
        <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
             style={{ background: `${accent}18` }}>
          <Icon size={16} style={{ color: accent }}/>
        </div>
      )}
      <div className="text-[11px] font-mono text-muted uppercase tracking-[1.5px] mb-2">{label}</div>
      <div className="text-3xl font-black tracking-tight" style={{ color: accent }}>{value ?? '—'}</div>
      {delta && (
        <div className={`text-xs font-mono mt-1.5 ${deltaUp ? 'text-success' : 'text-danger'}`}>
          {deltaUp ? '↑' : '↓'} {delta}
        </div>
      )}
    </div>
  )
}

export function ProgressBar({ value = 0, max = 100, color = '#00e5ff', className = '' }) {
  const pct = Math.min(100, (value / Math.max(max, 1)) * 100)
  return (
    <div className={`h-1 bg-border rounded-full overflow-hidden ${className}`}>
      <div className="h-full rounded-full transition-all duration-700"
           style={{ width: `${pct}%`, background: color }}/>
    </div>
  )
}

export function Toggle({ checked, onChange }) {
  return (
    <button onClick={() => onChange?.(!checked)}
      className={`relative w-9 h-5 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-border'}`}>
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow
                         transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`}/>
    </button>
  )
}

export function Badge({ children, color = 'blue' }) {
  const cls = { green: 'badge-green', red: 'badge-red', blue: 'badge-blue',
                yellow: 'badge-yellow', purple: 'badge-purple' }
  return <span className={cls[color] || cls.blue}>{children}</span>
}

export function Modal({ open, onClose, title, children, wide = false }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}/>
      <div className={`relative bg-surface border border-border rounded-2xl shadow-2xl
                        ${wide ? 'w-full max-w-2xl' : 'w-full max-w-md'} animate-fade-up`}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-black text-base">{title}</h2>
          <button onClick={onClose} className="text-muted hover:text-[#e8eaf0]"><X size={18}/></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export function FormField({ label, children }) {
  return (
    <div className="mb-4">
      <label className="block text-[11px] font-mono text-muted uppercase tracking-[1.5px] mb-1.5">{label}</label>
      {children}
    </div>
  )
}

export function Spinner({ size = 20 }) {
  return <Loader2 size={size} className="animate-spin text-accent"/>
}

export function Empty({ icon: Icon, text, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-surface2 border border-border flex items-center justify-center mb-4">
          <Icon size={24} className="text-muted"/>
        </div>
      )}
      <p className="text-muted text-sm font-mono">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ── WebSocket hook ────────────────────────────────────────
export function useWebSocket({ onEvent } = {}) {
  const ws      = useRef(null)
  const pingRef = useRef(null)
  const retryRef= useRef(null)
  const [connected, setConnected] = useState(false)

  const connect = useCallback(() => {
    if (typeof window === 'undefined') return
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url   = `${proto}//${window.location.host}/api/ws`
    try {
      ws.current = new WebSocket(url)
      ws.current.onopen = () => {
        setConnected(true)
        pingRef.current = setInterval(() => {
          if (ws.current?.readyState === 1) ws.current.send('ping')
        }, 25000)
      }
      ws.current.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data)
          if (msg.event !== 'pong') onEvent?.(msg.event, msg.data, msg.ts)
        } catch {}
      }
      ws.current.onclose = () => {
        setConnected(false)
        clearInterval(pingRef.current)
        retryRef.current = setTimeout(connect, 3000)
      }
      ws.current.onerror = () => ws.current?.close()
    } catch {}
  }, [onEvent])

  useEffect(() => {
    connect()
    return () => {
      clearInterval(pingRef.current)
      clearTimeout(retryRef.current)
      ws.current?.close()
    }
  }, [connect])

  return { connected }
}
