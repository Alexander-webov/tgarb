// src/app/api/ws/route.js
// Next.js App Router не поддерживает WebSocket напрямую.
// WebSocket сервер поднимается в custom server.js и слушает тот же порт.
// Этот файл — заглушка для документации.

import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    message: 'WebSocket доступен по ws://host/api/ws через custom server',
  })
}
