const jwt = require('jsonwebtoken')
const { models } = require('../models')

const SECRET = process.env.JWT_SECRET || 'dev_secret'

async function authenticate(req,res,next){
  const auth = req.headers.authorization
  if(!auth) return res.status(401).json({ error: 'Missing token' })
  const token = auth.replace('Bearer ','')
  try{
    const data = jwt.verify(token, SECRET)
    const user = await models.User.findByPk(data.id)
    if(!user) return res.status(401).json({ error: 'Invalid token' })
    req.user = user
    next()
  }catch(e){
    return res.status(401).json({ error: 'Invalid token' })
  }
}

function requireAdmin(req,res,next){
  if(!req.user) return res.status(401).json({ error: 'Missing auth' })
  if(req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' })
  next()
}

module.exports = { authenticate, requireAdmin }
