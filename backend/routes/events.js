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

// public: record an event (pageview, login, task, etc.)
router.post('/', async (req,res)=>{
  try{
    const { type='pageview', userId, email, phone, meta } = req.body || {}
    const raw = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || ''
    const { normalizeIp } = require('../utils/ip')
    const ip = normalizeIp(raw)
    const geo = geoip.lookup(ip) || null
    await models.LoginEvent.create({ userId: userId || null, email: email || null, phone: phone || null, ip, geo, userAgent: req.headers['user-agent'] || null, type, meta: meta || null })
    res.json({ ok:true })
  }catch(e){ console.error('Failed to save event', e); res.status(500).json({ error:'server' }) }
})

// admin: list recent events
router.get('/recent', allowAdminOrSecret(async (req,res)=>{
  const limit = Number(req.query.limit) || 100
  const evs = await models.LoginEvent.findAll({ order:[['createdAt','DESC']], limit })
  res.json({ events: evs })
}))

module.exports = router
