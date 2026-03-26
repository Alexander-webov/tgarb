// src/lib/auth.js
import { cookies } from 'next/headers'
import { prisma } from './prisma.js'
import { createHash, randomBytes } from 'crypto'

const SESSION_COOKIE = 'tgarb_session'
const SESSIONS = new Map() // In-memory sessions: token → {userId, expires}

// Hash password
export function hashPassword(password) {
  return createHash('sha256')
    .update(password + process.env.AUTH_SECRET || 'tgarb-secret-2024')
    .digest('hex')
}

// Create session token
export function createSessionToken() {
  return randomBytes(32).toString('hex')
}

// Set session cookie
export function setSession(token) {
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  SESSIONS.set(token, { expires })
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires,
    path: '/',
  })
}

// Validate session
export function validateSession() {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get(SESSION_COOKIE)?.value
    if (!token) return false
    const session = SESSIONS.get(token)
    if (!session) return false
    if (new Date() > session.expires) {
      SESSIONS.delete(token)
      return false
    }
    return true
  } catch {
    return false
  }
}

// Clear session
export function clearSession() {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get(SESSION_COOKIE)?.value
    if (token) SESSIONS.delete(token)
    cookies().delete(SESSION_COOKIE)
  } catch {}
}

// Check if any admin exists
export async function hasAdmin() {
  const count = await prisma.adminUser.count()
  return count > 0
}

// Verify credentials
export async function verifyCredentials(username, password) {
  const user = await prisma.adminUser.findUnique({ where: { username } })
  if (!user) return false
  return user.passwordHash === hashPassword(password)
}

// Create first admin
export async function createAdmin(username, password) {
  return prisma.adminUser.create({
    data: { username, passwordHash: hashPassword(password) }
  })
}
