const express = require('express')
const router = express.Router()
const { models } = require('../models')
const { authenticate, requireAdmin } = require('../middleware/auth')

// List pending deposits
// Allow admin access either via admin JWT or via admin-secret header. We'll create a small helper.
function allowAdminOrSecret(handler){
  return async (req,res)=>{
    try{
  // default admin secret (can be overridden with ADMIN_SECRET env var)
  const secret = process.env.ADMIN_SECRET || 'earnandearn'
      const headerSecret = req.headers['x-admin-secret'] || req.query.admin_secret
      if(headerSecret && headerSecret === secret){
        // bypass normal auth
        return handler(req,res)
      }
      // otherwise run authenticate -> requireAdmin -> handler
      return authenticate(req,res, () => {
        return requireAdmin(req,res, () => handler(req,res))
      })
    }catch(e){ console.error(e); return res.status(500).json({ error:'server' }) }
  }
}

router.get('/deposits', allowAdminOrSecret(async (req,res)=>{
  // include user basic info so admin can see who submitted each deposit
  const deposits = await models.Deposit.findAll({ where: { status: 'pending' }, order:[['createdAt','DESC']], include: [{ model: models.User, attributes: ['id','name','email'] }] })
  res.json({ deposits })
}))

// blocked IPs management
router.get('/blocked', allowAdminOrSecret(async (req,res)=>{
  const list = await models.BlockedIP.findAll({ order:[['blockedAt','DESC']] })
  res.json({ blocked: list })
}))

// whitelist management
router.get('/whitelist', allowAdminOrSecret(async (req,res)=>{
  const list = await models.WhitelistedIP.findAll({ order:[['addedAt','DESC']] })
  res.json({ whitelist: list })
}))

router.post('/whitelist', allowAdminOrSecret(async (req,res)=>{
  const { ip, note } = req.body || {}
  if(!ip) return res.status(400).json({ error: 'Missing ip' })
  const { normalizeIp } = require('../utils/ip')
  const n = normalizeIp(ip)
  await models.WhitelistedIP.upsert({ ip: n, note })
  res.json({ ok:true })
}))

router.post('/whitelist/:ip/remove', allowAdminOrSecret(async (req,res)=>{
  const raw = req.params.ip
  const { normalizeIp } = require('../utils/ip')
  const ip = normalizeIp(raw)
  const w = await models.WhitelistedIP.findByPk(ip)
  if(!w) return res.status(404).json({ error: 'Not found' })
  await w.destroy()
  res.json({ ok:true })
}))

router.post('/blocked/:ip/unblock', allowAdminOrSecret(async (req,res)=>{
  const raw = req.params.ip
  const { normalizeIp } = require('../utils/ip')
  const ip = normalizeIp(raw)
  const b = await models.BlockedIP.findByPk(ip)
  if(!b) return res.status(404).json({ error:'Not found' })
  await b.destroy()
  res.json({ ok:true })
}))

// Approve deposit
router.post('/deposits/:id/approve', allowAdminOrSecret(async (req,res)=>{
  const id = req.params.id
  const dep = await models.Deposit.findByPk(id)
  if(!dep) return res.status(404).json({ error:'Not found' })
  dep.status = 'approved'
  await dep.save()
  // credit user's wallet
  const user = await models.User.findByPk(dep.userId)
  user.wallet = (user.wallet || 0) + dep.amount
  user.isActive = true // activate account on deposit approval
  await user.save()
  await models.Transaction.create({ id: 't'+Date.now(), userId: user.id, type:'deposit', amount: dep.amount, meta: { depositId: dep.id } })
  res.json({ ok:true })
}))

// Reject deposit
router.post('/deposits/:id/reject', allowAdminOrSecret(async (req,res)=>{
  const id = req.params.id
  const dep = await models.Deposit.findByPk(id)
  if(!dep) return res.status(404).json({ error:'Not found' })
  dep.status = 'rejected'
  await dep.save()
  res.json({ ok:true })
}))

// list users
router.get('/users', allowAdminOrSecret(async (req,res)=>{
  const users = await models.User.findAll({ order:[['createdAt','DESC']] })
  res.json({ users })
}))

// get user details (transactions and deposits) for admin view
router.get('/users/:id', allowAdminOrSecret(async (req,res)=>{
  const id = req.params.id
  const user = await models.User.findByPk(id, { attributes: ['id','name','email','phone','role','wallet','payoutName','payoutMethod','payoutAccount','isActive','inviteCode','referredBy','createdAt'] })
  if(!user) return res.status(404).json({ error: 'Not found' })
  const transactions = await models.Transaction.findAll({ where: { userId: id }, order: [['createdAt','DESC']] })
  const deposits = await models.Deposit.findAll({ where: { userId: id }, order: [['createdAt','DESC']] })
  res.json({ user, transactions, deposits })
}))

// list all transactions
router.get('/transactions', allowAdminOrSecret(async (req,res)=>{
  const txs = await models.Transaction.findAll({ order:[['createdAt','DESC']] })
  res.json({ transactions: txs })
}))

// approve withdraw
router.post('/withdraws/:id/approve', allowAdminOrSecret(async (req,res)=>{
  const id = req.params.id
  const t = await models.Transaction.findByPk(id)
  if(!t) return res.status(404).json({ error:'Not found' })
  if(t.type !== 'withdraw') return res.status(400).json({ error:'Not a withdraw' })
  t.status = 'approved'
  await t.save()
  res.json({ ok:true })
}))

// list withdraw requests (for admin UI)
router.get('/withdraws', allowAdminOrSecret(async (req,res)=>{
  const txs = await models.Transaction.findAll({ where: { type: 'withdraw' }, order:[['createdAt','DESC']] })
  res.json({ withdraws: txs })
}))

// mark withdraw as sent (admin indicates they have sent the payment externally)
router.post('/withdraws/:id/sent', allowAdminOrSecret(async (req,res)=>{
  const id = req.params.id
  const t = await models.Transaction.findByPk(id)
  if(!t) return res.status(404).json({ error:'Not found' })
  if(t.type !== 'withdraw') return res.status(400).json({ error:'Not a withdraw' })
  t.status = 'sent'
  await t.save()
  res.json({ ok:true })
}))

// confirm withdraw completed (admin confirms funds were delivered)
router.post('/withdraws/:id/complete', allowAdminOrSecret(async (req,res)=>{
  const id = req.params.id
  const t = await models.Transaction.findByPk(id)
  if(!t) return res.status(404).json({ error:'Not found' })
  if(t.type !== 'withdraw') return res.status(400).json({ error:'Not a withdraw' })
  t.status = 'completed'
  await t.save()
  res.json({ ok:true })
}))

// reject withdraw => refund
router.post('/withdraws/:id/reject', allowAdminOrSecret(async (req,res)=>{
  const id = req.params.id
  const t = await models.Transaction.findByPk(id)
  if(!t) return res.status(404).json({ error:'Not found' })
  if(t.type !== 'withdraw') return res.status(400).json({ error:'Not a withdraw' })
  const user = await models.User.findByPk(t.userId)
  // refund
  user.wallet = (user.wallet || 0) + t.amount
  await user.save()
  t.status = 'rejected'
  await t.save()
  res.json({ ok:true })
}))

module.exports = router
