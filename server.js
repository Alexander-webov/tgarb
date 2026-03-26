// server.js — Custom Next.js server с WebSocket
// Запуск: node server.js (вместо next start)

import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { wsManager } from './src/lib/ws.js'

const dev  = process.env.NODE_ENV !== 'production'
const port = parseInt(process.env.PORT || '3000', 10)
const app  = next({ dev })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true)
    handle(req, res, parsedUrl)
  })

  // Attach WebSocket server to the same HTTP server
  wsManager.attach(server)

  server.listen(port, () => {
    console.log(`> TGArb ready on http://localhost:${port}`)
    console.log(`> WebSocket ready on ws://localhost:${port}/api/ws`)
  })
})
