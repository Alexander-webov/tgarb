export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Pure JS Telethon SQLite session → gram.js StringSession converter
// gram.js StringSession format: "1" + base64(dc_id(1) + ip(4) + port(2) + auth_key(256))
// Total payload = 263 bytes → base64 = 352 chars (gram.js recognizes this as Telethon format)
function readTelethonSession(buffer) {
  const magic = buffer.slice(0, 15).toString('utf8')
  if (!magic.startsWith('SQLite format 3')) {
    throw new Error('Файл не является SQLite базой данных')
  }

  const pageSize = buffer.readUInt16BE(16)
  const numPages = buffer.readUInt32BE(28)

  for (let pageIdx = 0; pageIdx < numPages; pageIdx++) {
    const pageOffset = pageIdx * pageSize
    if (pageOffset + pageSize > buffer.length) break
    if (buffer.readUInt8(pageOffset) !== 0x0D) continue

    const cellCount = buffer.readUInt16BE(pageOffset + 3)

    for (let i = 0; i < cellCount; i++) {
      const cellPtrOffset = pageOffset + 8 + (i * 2)
      if (cellPtrOffset + 2 > buffer.length) continue
      let cellOffset = buffer.readUInt16BE(cellPtrOffset)
      if (cellOffset === 0) cellOffset = pageSize
      cellOffset = pageOffset + cellOffset
      if (cellOffset >= buffer.length) continue

      try {
        const raw = buffer.slice(cellOffset)
        let pos = 0
        const [, pb] = readVarint(raw, pos); pos += pb
        const [rowid, rb] = readVarint(raw, pos); pos += rb  // rowid = dc_id

        const [headerSize, hb] = readVarint(raw, pos)
        const headerStart = pos; pos += hb

        const types = []
        while (pos < headerStart + headerSize) {
          const [t, tb] = readVarint(raw, pos); pos += tb
          types.push(t)
        }

        // sessions table: dc_id(NULL=rowid), server_address(text), port(int), auth_key(blob)
        if (types.length < 4 || types[0] !== 0) continue

        // server_address (text)
        if (types[1] < 13 || types[1] % 2 !== 1) continue
        const addrLen = (types[1] - 13) / 2
        const serverAddr = raw.slice(pos, pos + addrLen).toString('utf8'); pos += addrLen
        if (!serverAddr.match(/^\d+\.\d+\.\d+\.\d+$/)) continue

        // port (integer)
        let port = 0
        if (types[2] === 1) { port = raw.readInt8(pos); pos += 1 }
        else if (types[2] === 2) { port = raw.readInt16BE(pos); pos += 2 }
        else if (types[2] === 3) { port = raw.readIntBE(pos, 3); pos += 3 }
        else if (types[2] === 4) { port = raw.readInt32BE(pos); pos += 4 }
        else continue

        // auth_key (blob, must be 256 bytes)
        if (types[3] < 12 || types[3] % 2 !== 0) continue
        const keyLen = (types[3] - 12) / 2
        if (keyLen !== 256) continue
        const authKey = raw.slice(pos, pos + 256)

        const dcId = rowid
        if (dcId < 1 || dcId > 5) continue

        // Build gram.js StringSession:
        // "1" + base64(dc_id(1 byte) + ip(4 bytes) + port(2 bytes) + auth_key(256 bytes))
        const ipParts = serverAddr.split('.').map(Number)
        const payload = Buffer.alloc(1 + 4 + 2 + 256)
        payload.writeUInt8(dcId, 0)
        ipParts.forEach((b, i) => payload.writeUInt8(b, 1 + i))
        payload.writeUInt16BE(port, 5)
        authKey.copy(payload, 7)

        // gram.js uses regular base64 (not url-safe) with padding
        return '1' + payload.toString('base64')
      } catch {
        continue
      }
    }
  }

  throw new Error('Не удалось найти сессию в файле. Убедись что это .session файл от Telethon/TGManager')
}

function readVarint(buf, pos) {
  let result = 0
  for (let i = 0; i < 9; i++) {
    const b = buf[pos + i]
    if (i < 8) {
      result = result * 128 + (b & 0x7F)
      if ((b & 0x80) === 0) return [result, i + 1]
    } else {
      return [result * 256 + b, 9]
    }
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

    const jsonText = await jsonFile.text()
    const meta = JSON.parse(jsonText)
    const phone     = String(meta.phone || '').trim()
    const username  = meta.username || null
    const firstName = meta.first_name || null

    if (!phone) return NextResponse.json({ error: 'В JSON нет номера телефона' }, { status: 400 })

    const sessionBuffer = Buffer.from(await sessionFile.arrayBuffer())
    const sessionString = readTelethonSession(sessionBuffer)

    const phoneNorm = phone.startsWith('+') ? phone : `+${phone}`
    const existing = await prisma.tgAccount.findFirst({
      where: { OR: [{ phone: phoneNorm }, { phone }] }
    })

    if (existing) {
      await prisma.tgAccount.update({
        where: { id: existing.id },
        data: { sessionData: sessionString, username, firstName, status: 'OFFLINE' }
      })
    } else {
      await prisma.tgAccount.create({
        data: {
          phone: phoneNorm, sessionData: sessionString,
          username, firstName, status: 'OFFLINE',
          dailyLimit: 50, warmupDays: 0, niche: 'general',
        }
      })
    }

    return NextResponse.json({
      ok: true,
      message: `Аккаунт ${phoneNorm} (${firstName || username || 'Без имени'}) импортирован!`
    })
  } catch (err) {
    console.error('import-json error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
