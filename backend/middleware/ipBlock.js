const { models } = require('../models')
const jwt = require('jsonwebtoken')
const SECRET = process.env.JWT_SECRET || 'dev_secret'

// Middleware to block requests from IPs present in BlockedIP
async function ipBlock(req, res, next){
  try{
    const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || ''
    if(!ip) return next()
    const blocked = await models.BlockedIP.findByPk(ip)
    if(!blocked) return next()

    // allow admins to bypass (if token present and valid)
    const auth = req.headers.authorization
    if(auth){
      try{
        const token = auth.replace('Bearer ','')
        const data = jwt.verify(token, SECRET)
        if(data && data.role === 'admin') return next()
      }catch(e){ /* fallthrough */ }
    }

    return res.status(403).json({ error: 'Access blocked from this IP' })
  }catch(e){
    console.error('ipBlock error', e)
    return next()
  }
}

module.exports = { ipBlock }
