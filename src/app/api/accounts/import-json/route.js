export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Parse Telethon SQLite session file (pure JS, no sqlite3 dependency)
// SQLite stores sessions table with: dc_id INTEGER, server_address TEXT, port INTEGER, auth_key BLOB
async function extractSessionFromSQLite(buffer) {
  // Use Python-like approach via child process
  const { execSync, spawnSync } = await import('child_process')
  const { writeFileSync, unlinkSync } = await import('fs')
  const { tmpdir } = await import('os')
  const { join } = await import('path')
  const { randomBytes } = await import('crypto')

  const tmpFile = join(tmpdir(), `s_${randomBytes(6).toString('hex')}.session`)
  writeFileSync(tmpFile, buffer)

  try {
    const result = spawnSync('python3', ['-c', `
import sqlite3, base64, struct, ipaddress
conn = sqlite3.connect('${tmpFile}')
row = conn.execute('SELECT dc_id, server_address, port, auth_key FROM sessions').fetchone()
conn.close()
dc_id, server_address, port, auth_key = row
ip = ipaddress.ip_address(server_address)
ip_bytes = ip.packed
data = struct.pack('>B', dc_id) + ip_bytes + struct.pack('>H', port) + auth_key
print(base64.urlsafe_b64encode(data).decode())
`], { encoding: 'utf8', timeout: 10000 })

    if (result.error || result.status !== 0) {
      throw new Error(result.stderr || 'Failed to parse session file')
    }

    return result.stdout.trim()
  } finally {
    try { unlinkSync(tmpFile) } catch {}
  }
}

export async function POST(req) {
  try {
    const formData = await req.formData()
    const jsonFile    = formData.get('json')
    const sessionFile = formData.get('session')

    if (!jsonFile || !sessionFile) {
      return NextResponse.json({ error: 'Нужны оба файла: .json и .session' }, { status: 400 })
    }

    // Parse JSON metadata
    const jsonText = await jsonFile.text()
    const meta = JSON.parse(jsonText)
    const phone     = String(meta.phone || '').trim()
    const username  = meta.username || null
    const firstName = meta.first_name || null
    const lastName  = meta.last_name || null

    if (!phone) return NextResponse.json({ error: 'В JSON нет номера телефона' }, { status: 400 })

    // Convert .session SQLite → StringSession
    const sessionBuffer = Buffer.from(await sessionFile.arrayBuffer())
    const sessionString = await extractSessionFromSQLite(sessionBuffer)

    if (!sessionString) {
      return NextResponse.json({ error: 'Не удалось извлечь сессию из файла' }, { status: 400 })
    }

    // Save to DB
    const phone_with_plus = phone.startsWith('+') ? phone : `+${phone}`
    const existing = await prisma.tgAccount.findFirst({
      where: { OR: [{ phone: phone_with_plus }, { phone }] }
    })

    if (existing) {
      await prisma.tgAccount.update({
        where: { id: existing.id },
        data: { sessionData: sessionString, username, firstName, status: 'OFFLINE' }
      })
    } else {
      await prisma.tgAccount.create({
        data: {
          phone: phone_with_plus,
          sessionData: sessionString,
          username,
          firstName,
          status: 'OFFLINE',
          dailyLimit: 50,
          warmupDays: 0,
          niche: 'general',
        }
      })
    }

    return NextResponse.json({
      ok: true,
      phone: phone_with_plus,
      message: `Аккаунт +${phone} (${firstName || username || 'Без имени'}) импортирован!`
    })
  } catch (err) {
    console.error('import-json error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
