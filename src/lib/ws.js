// src/lib/ws.js
import { WebSocketServer } from 'ws'

class WsManager {
  constructor() {
    this._clients = new Set()
    this._wss = null
  }

  attach(server) {
    this._wss = new WebSocketServer({ server, path: '/api/ws' })
    this._wss.on('connection', (ws) => {
      this._clients.add(ws)
      ws.send(JSON.stringify({ event: 'connected', data: { status: 'ok' } }))

      ws.on('message', (msg) => {
        if (msg.toString() === 'ping') ws.send(JSON.stringify({ event: 'pong', data: {} }))
      })
      ws.on('close', () => this._clients.delete(ws))
      ws.on('error', () => this._clients.delete(ws))
    })
  }

  broadcast(event, data) {
    const payload = JSON.stringify({ event, data, ts: new Date().toISOString() })
    const dead = []
    for (const ws of this._clients) {
      try {
        if (ws.readyState === 1) ws.send(payload)
        else dead.push(ws)
      } catch { dead.push(ws) }
    }
    dead.forEach(ws => this._clients.delete(ws))
  }

  get clientCount() { return this._clients.size }
}

export const wsManager = new WsManager()
