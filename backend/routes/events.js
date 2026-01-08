const express = require('express')
const router = express.Router()
const { models } = require('../models')
const geoip = require('geoip-lite')

function allowAdminOrSecret(handler){
  return async (req,res)=>{
    try{
      const secret = process.env.ADMIN_SECRET || 'earnandearn'
      const headerSecret = req.headers['x-admin-secret'] || req.query.admin_secret
      if(headerSecret && headerSecret === secret){
        return handler(req,res)
      }
      const { authenticate, requireAdmin } = require('../middleware/auth')
      return authenticate(req,res, () => requireAdmin(req,res, () => handler(req,res)))
    }catch(e){ console.error(e); return res.status(500).json({ error:'server' }) }
  }
}

// cached columns for LoginEvents (to avoid repeated PRAGMA calls)
let _loginEventCols = null
async function getLoginEventColumns(){
  if(_loginEventCols) return _loginEventCols
  try{
    const raw = await models.sequelize.query("PRAGMA table_info('LoginEvents')")
    _loginEventCols = raw && raw[0] ? raw[0].map(r => r.name) : []
    return _loginEventCols
  }catch(e){ console.error('Could not read LoginEvents columns', e && e.message); return [] }
}

// public: record an event (pageview, login, task, etc.)
router.post('/', async (req,res)=>{
  try{
    const { type='pageview', userId, email, phone, meta } = req.body || {}
    const { getClientIp } = require('../utils/ip')
    const ip = getClientIp(req)
    const geo = (ip ? geoip.lookup(ip) : null) || null

    // Build payload using only existing columns (helps when production DB schema is older)
    const cols = await getLoginEventColumns()
    const payload = {}
    if(cols.includes('userId')) payload.userId = userId || null
    if(cols.includes('email')) payload.email = email || null
    if(cols.includes('phone')) payload.phone = phone || null
    // Prefer client-provided public IP (clientIp) if present and valid, otherwise use computed ip
    const clientIpFromBody = req.body && req.body.clientIp ? String(req.body.clientIp).trim() : ''
    const candidateIp = (clientIpFromBody && !isPrivateIp(clientIpFromBody)) ? clientIpFromBody : ip
    if(cols.includes('ip')) payload.ip = candidateIp || null
    if(cols.includes('geo')) payload.geo = geo
    if(cols.includes('userAgent')) payload.userAgent = req.headers['user-agent'] || null
    if(cols.includes('type')) payload.type = type

    // attach meta (merge incoming meta with a header snapshot for debugging)
    if(cols.includes('meta')){
      payload.meta = Object.assign({}, meta || {})
      payload.meta._headers = {
        x_forwarded_for: req.headers['x-forwarded-for'] || null,
        x_real_ip: req.headers['x-real-ip'] || null,
        cf_connecting_ip: req.headers['cf-connecting-ip'] || null,
        forwarded: req.headers['forwarded'] || null,
        remote_addr: req.ip || (req.socket && req.socket.remoteAddress) || null,
        clientIp_from_body: clientIpFromBody || null
      }
    }

    try{
      await models.LoginEvent.create(payload)
      // Log a helpful line when IP is missing so we can diagnose live
      if(!payload.ip){ console.warn('Event saved without IP. header snapshot:', payload.meta && payload.meta._headers) }
      return res.json({ ok:true })
    }catch(e){
      // non-fatal: log and return accepted so production callers don't see 500 for analytics
      console.error('Failed to save event to DB (non-fatal)', e && e.message)
      return res.status(202).json({ ok:false, accepted: true })
    }

  }catch(e){ console.error('Event handler failed', e); res.status(500).json({ error:'server' }) }
})

// admin: list recent events
router.get('/recent', allowAdminOrSecret(async (req,res)=>{
  const limit = Number(req.query.limit) || 100
  const evs = await models.LoginEvent.findAll({ order:[['createdAt','DESC']], limit })
  res.json({ events: evs })
}))

module.exports = router
