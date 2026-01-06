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
    const rawIp = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || ''
    const { normalizeIp } = require('../utils/ip')
    const signupIp = normalizeIp(rawIp)
    if(!email || !password) return res.status(400).json({ error:'email & password required' })
    const exists = await models.User.findOne({ where: { email } })
    if(exists) return res.status(400).json({ error:'User exists' })
    // honeypot: if another user was created from same IP, reject signup but avoid auto-blocking to prevent false positives (NATs)
    const other = signupIp ? await models.User.findOne({ where: { signupIp } }) : null
    if(other){
      // if IP is whitelisted, allow
      const wh = signupIp ? await models.WhitelistedIP.findByPk(signupIp) : null
      if(wh){
        console.log('Signup attempt from whitelisted IP, allowing:', signupIp)
      }else{
        // Do NOT automatically block the IP (could be NAT/shared). Return a clear error so admin can review.
        return res.status(429).json({ error: 'Too many signups from this IP — contact support' })
      }
    }
    const hashed = await bcrypt.hash(password, 10)
    const id = 'u'+Date.now()
    // generate an invite code for this user
    const inviteCode = 'INV' + Math.random().toString(36).substring(2,8).toUpperCase()
    // if referral is provided, try to resolve referring user by inviteCode
    let referredBy = null
    if(referral){
      const refUser = await models.User.findOne({ where: { inviteCode: referral } })
      if(refUser) referredBy = refUser.id
    }
    const user = await models.User.create({ id, name, email, phone, password: hashed, referralCode: referral || null, inviteCode, referredBy, signupIp, registrationBonusPending: false, registrationBonusClaimedAt: new Date() })
    // give new user a registration bonus (50 PKR)
    try{
      const bonus = 50
      user.wallet = (user.wallet || 0) + bonus
      await user.save()
      await models.Transaction.create({ id: 't'+Date.now(), userId: user.id, type:'registration_bonus', amount: bonus, meta: {} })
    }catch(e){ console.error('Failed to credit signup bonus', e) }
    const token = createToken(user)
    return res.json({ user: { id: user.id, name:user.name, email:user.email, role:user.role, wallet:user.wallet, inviteCode: user.inviteCode }, token })
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
  return res.json({ user: { id: u.id, name:u.name, email:u.email, role:u.role, wallet:u.wallet, isActive: u.isActive, inviteCode: u.inviteCode, referredBy: u.referredBy, currentPackageId: u.currentPackageId, packageExpiresAt: u.packageExpiresAt, payoutName: u.payoutName, payoutMethod: u.payoutMethod, payoutAccount: u.payoutAccount, registrationBonusPending: u.registrationBonusPending } })
})

// update profile (name only for demo)
router.put('/me', authenticate, async (req,res)=>{
  const { name, payoutName, payoutMethod, payoutAccount } = req.body || {}
  if(name){ req.user.name = name }
  if(payoutName !== undefined) req.user.payoutName = payoutName
  if(payoutMethod !== undefined) req.user.payoutMethod = payoutMethod
  if(payoutAccount !== undefined) req.user.payoutAccount = payoutAccount
  await req.user.save()
  return res.json({ user: { id: req.user.id, name: req.user.name, email: req.user.email, wallet: req.user.wallet, isActive: req.user.isActive, inviteCode: req.user.inviteCode, payoutName: req.user.payoutName, payoutMethod: req.user.payoutMethod, payoutAccount: req.user.payoutAccount } })
})

// change password (authenticated)
router.post('/change-password', authenticate, async (req,res)=>{
  try{
    const { oldPassword, newPassword } = req.body || {}
    if(!oldPassword || !newPassword) return res.status(400).json({ error: 'oldPassword and newPassword required' })
    const ok = await bcrypt.compare(oldPassword, req.user.password)
    if(!ok) return res.status(400).json({ error: 'Invalid current password' })
    const hashed = await bcrypt.hash(newPassword, 10)
    req.user.password = hashed
    await req.user.save()
    return res.json({ ok:true })
  }catch(e){ console.error('Change password failed', e); return res.status(500).json({ error:'server' }) }
})

module.exports = router
