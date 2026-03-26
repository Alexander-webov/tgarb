// server.js — Custom Next.js server with WebSocket
import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { wsManager } from './src/lib/ws.js'

const dev  = process.env.NODE_ENV !== 'production'
const port = parseInt(process.env.PORT || '3000', 10)
const app  = next({ dev, dir: '.' })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true)
    handle(req, res, parsedUrl)
  })

  wsManager.attach(server)

  server.listen(port, '0.0.0.0', () => {
    console.log(`> TGArb ready on http://localhost:${port}`)
    console.log(`> WebSocket ready on ws://localhost:${port}/api/ws`)
  })
})
