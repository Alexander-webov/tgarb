// src/lib/cpa/index.js
import { env } from '../env.js'

// Shared mock data function (not private to any class)
function mockOffers(network) {
  return [
    {
      id: `${network}_1`,
      name: 'CryptoTab Browser RU',
      category: 'Crypto',
      payout: 2.5,
      currency: 'USD',
      payoutType: 'CPI',
      network,
      description: 'Установка крипто-браузера',
      siteUrl: '',
    },
    {
      id: `${network}_2`,
      name: 'Mostbet Casino — FTD',
      category: 'Gambling',
      payout: 50.0,
      currency: 'USD',
      payoutType: 'CPA',
      network,
      description: 'Первый депозит в казино',
      siteUrl: '',
    },
    {
      id: `${network}_3`,
      name: 'MEXC Exchange — Registration',
      category: 'Crypto',
      payout: 18.0,
      currency: 'USD',
      payoutType: 'CPL',
      network,
      description: 'Регистрация на бирже MEXC',
      siteUrl: '',
    },
  ]
}

function mockStats() {
  return { clicks: 0, leads: 0, revenue: 0.0, cr: 0.0 }
}

// ── Admitad ───────────────────────────────────────────────
class AdmitadService {
  _token = null

  async _getToken() {
    if (this._token) return this._token
    if (!env.ADMITAD_TOKEN) return null
    try {
      const res = await fetch('https://api.admitad.com/token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: env.ADMITAD_PUBLISHER_ID,
          client_secret: env.ADMITAD_TOKEN,
          scope: 'advcampaigns statistics',
        }),
      })
      const data = await res.json()
      this._token = data.access_token
      return this._token
    } catch {
      return null
    }
  }

  async getOffers() {
    const token = await this._getToken()
    if (!token) return mockOffers('admitad')
    try {
      const res = await fetch(
        'https://api.admitad.com/advcampaigns/?limit=50&status=active',
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const data = await res.json()
      return (data.results || []).map(o => ({
        id: String(o.id),
        name: o.name,
        description: (o.description || '').slice(0, 200),
        category: o.categories?.[0]?.name || '',
        payout: o.ecpc || 0,
        currency: 'USD',
        payoutType: 'CPA',
        network: 'admitad',
        siteUrl: o.site_url || '',
      }))
    } catch {
      return mockOffers('admitad')
    }
  }

  async getStats(dateFrom, dateTo) {
    const token = await this._getToken()
    if (!token) return mockStats()
    try {
      const params = new URLSearchParams({
        date_start: (dateFrom || new Date(Date.now() - 7 * 864e5)).toLocaleDateString('ru-RU'),
        date_end: (dateTo || new Date()).toLocaleDateString('ru-RU'),
        limit: '500',
      })
      const res = await fetch(
        `https://api.admitad.com/statistics/actions/?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const data = await res.json()
      const rows = data.results || []
      const clicks = rows.reduce((s, r) => s + (r.clicks || 0), 0)
      const leads = rows.filter(r => ['approved', 'pending'].includes(r.status)).length
      const revenue = rows.reduce((s, r) => s + parseFloat(r.payment || 0), 0)
      return {
        clicks,
        leads,
        revenue: +revenue.toFixed(2),
        cr: clicks ? +(leads / clicks * 100).toFixed(2) : 0,
      }
    } catch {
      return mockStats()
    }
  }
}

// ── LeadGid ───────────────────────────────────────────────
class LeadGidService {
  async getOffers() {
    if (!env.LEADGID_API_KEY) return mockOffers('leadgid')
    try {
      const res = await fetch(
        'https://api.leadgid.ru/api/offers?status=active&limit=100',
        { headers: { Authorization: `Bearer ${env.LEADGID_API_KEY}` } }
      )
      const data = await res.json()
      return (data.data || []).map(o => ({
        id: String(o.id),
        name: o.name,
        description: (o.description || '').slice(0, 200),
        category: o.vertical || '',
        payout: parseFloat(o.payout || 0),
        currency: o.currency || 'USD',
        payoutType: o.payout_type || 'CPA',
        network: 'leadgid',
        geo: o.geo || [],
        siteUrl: '',
      }))
    } catch {
      return mockOffers('leadgid')
    }
  }

  async getStats(dateFrom, dateTo) {
    if (!env.LEADGID_API_KEY) return mockStats()
    try {
      const from = (dateFrom || new Date(Date.now() - 7 * 864e5)).toISOString().slice(0, 10)
      const to = (dateTo || new Date()).toISOString().slice(0, 10)
      const res = await fetch(
        `https://api.leadgid.ru/api/statistics?date_from=${from}&date_to=${to}`,
        { headers: { Authorization: `Bearer ${env.LEADGID_API_KEY}` } }
      )
      const data = await res.json()
      const rows = data.data || []
      return {
        clicks: rows.reduce((s, r) => s + (r.clicks || 0), 0),
        leads: rows.reduce((s, r) => s + (r.leads || 0), 0),
        revenue: +rows.reduce((s, r) => s + parseFloat(r.revenue || 0), 0).toFixed(2),
        cr: 0,
      }
    } catch {
      return mockStats()
    }
  }
}

// ── Alfaleads ─────────────────────────────────────────────
class AlfaleadsService {
  async getOffers() {
    if (!env.ALFALEADS_API_KEY) return mockOffers('alfaleads')
    try {
      const res = await fetch(
        `https://api.alfaleads.net/v1/offers?api_key=${env.ALFALEADS_API_KEY}&status=active`
      )
      const data = await res.json()
      return (data.offers || []).map(o => ({
        id: String(o.id),
        name: o.title || o.name || '',
        description: (o.description || '').slice(0, 200),
        category: o.category || '',
        payout: parseFloat(o.payout || 0),
        currency: o.currency || 'USD',
        payoutType: o.type || 'CPA',
        network: 'alfaleads',
        geo: o.countries || [],
        siteUrl: o.landing_url || '',
      }))
    } catch {
      return mockOffers('alfaleads')
    }
  }

  async getStats(dateFrom, dateTo) {
    if (!env.ALFALEADS_API_KEY) return mockStats()
    try {
      const from = (dateFrom || new Date(Date.now() - 7 * 864e5)).toISOString().slice(0, 10)
      const to = (dateTo || new Date()).toISOString().slice(0, 10)
      const res = await fetch(
        `https://api.alfaleads.net/v1/statistics?api_key=${env.ALFALEADS_API_KEY}&date_from=${from}&date_to=${to}`
      )
      const d = await res.json()
      return {
        clicks: d.clicks || 0,
        leads: d.leads || 0,
        revenue: +(d.revenue || 0),
        cr: +(d.cr || 0),
      }
    } catch {
      return mockStats()
    }
  }
}

export const admitadService = new AdmitadService()
export const leadgidService = new LeadGidService()
export const alfaleadsService = new AlfaleadsService()

export async function getAllNetworkStats(dateFrom, dateTo) {
  const [a, l, al] = await Promise.allSettled([
    admitadService.getStats(dateFrom, dateTo),
    leadgidService.getStats(dateFrom, dateTo),
    alfaleadsService.getStats(dateFrom, dateTo),
  ])
  const safe = r => (r.status === 'fulfilled' ? r.value : mockStats())
  const A = safe(a), L = safe(l), AL = safe(al)
  const totalClicks = A.clicks + L.clicks + AL.clicks
  const totalLeads = A.leads + L.leads + AL.leads
  const totalRevenue = +(A.revenue + L.revenue + AL.revenue).toFixed(2)
  return {
    total: {
      clicks: totalClicks,
      leads: totalLeads,
      revenue: totalRevenue,
      cr: totalClicks ? +(totalLeads / totalClicks * 100).toFixed(2) : 0,
    },
    byNetwork: { admitad: A, leadgid: L, alfaleads: AL },
  }
}
