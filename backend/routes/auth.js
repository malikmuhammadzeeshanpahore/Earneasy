const express = require('express')
const router = express.Router()
const { models } = require('../models')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const SECRET = process.env.JWT_SECRET || 'dev_secret'

function createToken(user){
  return jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: '7d' })
}

// signup
router.post('/signup', async (req,res)=>{
  try{
    const { name, email, phone, password, referral } = req.body
    const signupIp = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || ''
    if(!email || !password) return res.status(400).json({ error:'email & password required' })
    const exists = await models.User.findOne({ where: { email } })
    if(exists) return res.status(400).json({ error:'User exists' })
    // honeypot: if another user was created from same IP, block the IP and reject signup
    const other = signupIp ? await models.User.findOne({ where: { signupIp } }) : null
    if(other){
      await models.BlockedIP.upsert({ ip: signupIp, reason: 'multiple_signups' })
      return res.status(403).json({ error: 'Signups from this IP are blocked' })
    }
    const hashed = await bcrypt.hash(password, 10)
    const id = 'u'+Date.now()
    const user = await models.User.create({ id, name, email, phone, password: hashed, referralCode: referral || null, signupIp })
    const token = createToken(user)
    return res.json({ user: { id: user.id, name:user.name, email:user.email, role:user.role, wallet:user.wallet }, token })
  }catch(e){ console.error(e); return res.status(500).json({ error:'server' }) }
})

// login
router.post('/login', async (req,res)=>{
  try{
    const { email, password } = req.body
    const user = await models.User.findOne({ where: { email } })
    if(!user) return res.status(400).json({ error:'Invalid credentials' })
    const ok = await bcrypt.compare(password, user.password)
    if(!ok) return res.status(400).json({ error:'Invalid credentials' })
    const token = createToken(user)
    return res.json({ user: { id: user.id, name:user.name, email:user.email, role:user.role, wallet:user.wallet }, token })
  }catch(e){ console.error(e); return res.status(500).json({ error:'server' }) }
})

// current user
const { authenticate } = require('../middleware/auth')
router.get('/me', authenticate, async (req,res)=>{
  const u = req.user
  return res.json({ user: { id: u.id, name:u.name, email:u.email, role:u.role, wallet:u.wallet, isActive: u.isActive } })
})

// update profile (name only for demo)
router.put('/me', authenticate, async (req,res)=>{
  const { name } = req.body
  if(name){ req.user.name = name; await req.user.save() }
  return res.json({ user: { id: req.user.id, name: req.user.name, email: req.user.email, wallet: req.user.wallet, isActive: req.user.isActive } })
})

module.exports = router
