// src/lib/auth.js
import { createHash, randomBytes } from 'crypto'
import { prisma } from './prisma.js'

export const SESSION_COOKIE = 'tgarb_session'

export function hashPassword(password) {
  return createHash('sha256')
    .update(password + (process.env.AUTH_SECRET || 'tgarb-secret-2024'))
    .digest('hex')
}

export function createToken() {
  return randomBytes(32).toString('hex')
}

// Token store - in-memory (use Redis for multi-instance)
const tokenStore = globalThis._tokenStore || (globalThis._tokenStore = new Map())

export function storeToken(token, userId) {
  tokenStore.set(token, { userId, expires: Date.now() + 7 * 24 * 60 * 60 * 1000 })
}

export function getUserIdFromToken(token) {
  if (!token) return null
  const entry = tokenStore.get(token)
  if (!entry) return null
  if (Date.now() > entry.expires) { tokenStore.delete(token); return null }
  return entry.userId
}

export function deleteToken(token) {
  tokenStore.delete(token)
}

export async function getCurrentUser(cookieValue) {
  if (!cookieValue) return null
  const userId = getUserIdFromToken(cookieValue)
  if (!userId) return null
  return prisma.user.findUnique({ where: { id: userId } })
}

export async function registerUser(email, username, password) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] }
  })
  if (existing) {
    if (existing.email === email) throw new Error('Email уже используется')
    throw new Error('Username уже занят')
  }
  const count = await prisma.user.count()
  const isFirst = count === 0
  return prisma.user.create({
    data: {
      email, username,
      passwordHash: hashPassword(password),
      role: isFirst ? 'ADMIN' : 'PENDING',
      isApproved: isFirst,
    }
  })
}

export async function loginUser(login, password) {
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: login }, { username: login }] }
  })
  if (!user) throw new Error('Пользователь не найден')
  if (user.passwordHash !== hashPassword(password)) throw new Error('Неверный пароль')
  if (!user.isApproved || user.role === 'PENDING') throw new Error('PENDING')
  return user
}

export async function getAllUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, email: true, username: true, role: true, isApproved: true, createdAt: true }
  })
}

export async function approveUser(userId) {
  return prisma.user.update({ where: { id: userId }, data: { isApproved: true, role: 'USER' } })
}

export async function rejectUser(userId) {
  return prisma.user.update({ where: { id: userId }, data: { isApproved: false, role: 'PENDING' } })
}

export async function setAdmin(userId) {
  return prisma.user.update({ where: { id: userId }, data: { role: 'ADMIN', isApproved: true } })
}
