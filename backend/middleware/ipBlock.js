const { models } = require('../models')
const jwt = require('jsonwebtoken')
const { normalizeIp } = require('../utils/ip')
const SECRET = process.env.JWT_SECRET || 'dev_secret'

// In-memory cache to reduce DB lookups for IP checks (TTL 30s)
const CACHE_TTL = 30 * 1000
const cache = { blocked: new Map(), whitelist: new Map() }

function cacheGet(map, key){
  const v = map.get(key)
  if(!v) return null
  if(Date.now() > v.expiry){ map.delete(key); return null }
  return v.value
}
function cacheSet(map, key, value){ map.set(key, { value, expiry: Date.now() + CACHE_TTL }) }

// Middleware to block requests from IPs present in BlockedIP
async function ipBlock(req, res, next){
  try{
    const raw = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || ''
    const ip = normalizeIp(raw)
    if(!ip) return next()

    // check whitelist cache/DB
    const whCached = cacheGet(cache.whitelist, ip)
    if(whCached !== null){ if(whCached) return next() } else {
      const wh = await models.WhitelistedIP.findByPk(ip)
      const ok = !!wh
      cacheSet(cache.whitelist, ip, ok)
      if(ok) return next()
    }

    // check blocked cache/DB
    const blockedCached = cacheGet(cache.blocked, ip)
    if(blockedCached !== null){ if(!blockedCached) return next() } else {
      const blocked = await models.BlockedIP.findByPk(ip)
      const isBlocked = !!blocked
      cacheSet(cache.blocked, ip, isBlocked)
      if(!isBlocked) return next()
    }

    // allow admins to bypass (if token present and valid)
    const auth = req.headers.authorization
    if(auth){
      try{
        const token = auth.replace('Bearer ','')
        const data = jwt.verify(token, SECRET)
        if(data && data.role === 'admin') return next()
      }catch(e){ /* fallthrough */ }
    }

    console.warn('Blocked request from IP', ip)
    return res.status(403).json({ error: 'Access blocked from this IP' })
  }catch(e){
    console.error('ipBlock error', e)
    return next()
  }
}

module.exports = { ipBlock }
